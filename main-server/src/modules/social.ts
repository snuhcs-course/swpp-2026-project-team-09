import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { randomUUID, createHash } from "node:crypto";
import { Database, Transaction } from "./database";
import {
  assertScheduleAvailable,
  lockScheduleUsers,
} from "./schedule-conflicts";
import { userView } from "./auth";
import { bad, bool, capacity, dates, object, text, uuid } from "./validation";
export function ensureCapacity(current: number, incoming: number, max: number) {
  if (current + incoming > max) throw new ConflictException("Party is full");
}
@Injectable()
export class SocialService {
  constructor(private db: Database) {}
  async members(c: Transaction, id: string) {
    return (
      await c.partyMember.findMany({
        where: { party_id: id },
        select: { user_id: true },
      })
    ).map((r) => r.user_id);
  }
  async party(c: Transaction, id: string, viewer?: string) {
    const row = (
      await c.$queryRaw<
        any[]
      >`SELECT * FROM parties WHERE id=${id}::uuid FOR SHARE`
    )[0];
    if (!row) throw new NotFoundException("Party not found");
    const memberRows = await c.partyMember.findMany({
      where: { party_id: id },
    });
    const memberIds = memberRows.map((r) => r.user_id);
    const ownMembership = memberRows.find((r) => r.user_id === viewer);
    if (row.visibility === "private" && viewer && !ownMembership)
      throw new NotFoundException("Party not found");
    const members =
      viewer && !memberIds.includes(viewer)
        ? []
        : (
            await c.user.findMany({
              where: { memberships: { some: { party_id: id } } },
              orderBy: { id: "asc" },
            })
          ).map(userView);
    return {
      id: row.id,
      title: row.title,
      eventId: row.event_id,
      maxMembers: row.max_members,
      visibility: row.visibility as "public" | "private",
      memberCount: memberRows.length,
      isMember: Boolean(ownMembership),
      members,
      ...(ownMembership
        ? { sharingEnabled: ownMembership.sharing_enabled as boolean }
        : {}),
      createdAt: row.created_at.toISOString(),
    };
  }
  async listParties(user: string) {
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const ids = await c.party.findMany({
        where: {
          OR: [
            { visibility: "public" },
            { members: { some: { user_id: user } } },
          ],
        },
        select: { id: true },
        orderBy: { created_at: "desc" },
        take: 100,
      });
      const items = [];
      for (const row of ids) items.push(await this.party(c, row.id, user));
      return { items };
    });
  }
  async validateEvent(c: Transaction, eventId: string | null) {
    if (!eventId) return null;
    const event = (
      await c.$queryRaw<
        any[]
      >`SELECT * FROM events WHERE id=${eventId}::uuid AND status='published' FOR SHARE`
    )[0];
    if (!event) bad("Published event required");
    return event;
  }
  async createParty(user: string, body: any) {
    const b = object(body),
      title = text(b.title, "title", 200),
      max = capacity(b.maxMembers),
      eventId = b.eventId ? uuid(b.eventId) : null;
    this.db.requireReady();
    return this.db.tx(async (c) => {
      await this.validateEvent(c, eventId);
      const id = randomUUID();
      await c.party.create({
        data: { id, title, event_id: eventId, max_members: max },
      });
      await c.partyMember.create({ data: { party_id: id, user_id: user } });
      await this.db.hint(c, "party.changed", id, [user]);
      return this.party(c, id, user);
    });
  }
  async join(user: string, id: string) {
    uuid(id);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const r = (
        await c.$queryRaw<
          any[]
        >`SELECT * FROM parties WHERE id=${id}::uuid FOR UPDATE`
      )[0];
      if (!r) throw new NotFoundException("Party not found");
      const ids = await this.members(c, id);
      if (!ids.includes(user)) {
        if (r.visibility === "private")
          throw new NotFoundException("Party not found");
        await this.validateEvent(c, r.event_id);
        ensureCapacity(ids.length, 1, r.max_members);
        await c.partyMember.create({ data: { party_id: id, user_id: user } });
        await this.db.hint(c, "party.changed", id, [...ids, user]);
      }
      return this.party(c, id, user);
    });
  }
  async leave(user: string, id: string) {
    uuid(id);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const [party] = await c.$queryRaw<
        { visibility: string }[]
      >`SELECT visibility FROM parties WHERE id=${id}::uuid FOR UPDATE`;
      const ids = await this.members(c, id);
      if (party?.visibility === "private" && !ids.includes(user))
        throw new NotFoundException("Party not found");
      await c.partyMember.deleteMany({
        where: { party_id: id, user_id: user },
      });
      await this.db.hint(c, "party.changed", id, [...ids, user]);
      return { ok: true };
    });
  }
  async match(body: any) {
    const b = object(body),
      requestId = uuid(b.requestId),
      title = text(b.title, "title", 200),
      max = capacity(b.maxMembers),
      eventId = b.eventId ? uuid(b.eventId) : null;
    if (
      !Array.isArray(b.userIds) ||
      !Array.isArray(b.requestIds) ||
      b.userIds.length !== b.requestIds.length ||
      b.userIds.length < 2
    )
      bad("Paired userIds/requestIds required");
    const interval = dates({ startsAt: b.timeStart, endsAt: b.timeEnd });
    const users: string[] = b.userIds.map(uuid),
      requests: string[] = b.requestIds.map(uuid);
    if (
      new Set(users).size !== users.length ||
      new Set(requests).size !== requests.length
    )
      bad("Duplicate user/request");
    ensureCapacity(0, users.length, max);
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          title,
          max,
          eventId,
          interval,
          pairs: users
            .map((u, i) => [u, requests[i]])
            .sort((a, b) => a[0].localeCompare(b[0])),
        }),
      )
      .digest("hex");
    this.db.requireReady();
    return this.db.tx(async (c) => {
      await c.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${requestId},0))`;
      const prior = await c.matchBatch.findUnique({
        where: { request_id: requestId },
      });
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new ConflictException("Request id already has different input");
        return this.party(c, prior.party_id);
      }
      // Lock users consistently, then consumption check is serial even across different batch IDs.
      const found = await c.$queryRaw<
        { id: string }[]
      >`SELECT id FROM users WHERE id IN (${Prisma.join(users.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR UPDATE`;
      if (found.length !== users.length) bad("Unknown matching user");
      if (
        await c.consumedMatchRequest.count({
          where: { request_id: { in: requests } },
        })
      )
        throw new ConflictException("Matching request already consumed");
      const event = await this.validateEvent(c, eventId);
      if (
        event &&
        (event.starts_at.getTime() < Date.parse(interval.startsAt) ||
          event.ends_at.getTime() > Date.parse(interval.endsAt))
      )
        bad("Event must fit within every matching request time interval");
      const id = randomUUID();
      await c.party.create({
        data: { id, title, event_id: eventId, max_members: max },
      });
      await c.partyMember.createMany({
        data: users.map((user_id) => ({ party_id: id, user_id })),
      });
      await c.consumedMatchRequest.createMany({
        data: users.map((user_id, i) => ({
          request_id: requests[i],
          user_id,
          party_id: id,
        })),
      });
      await c.matchBatch.create({
        data: { request_id: requestId, party_id: id, fingerprint },
      });
      await this.db.hint(c, "party.changed", id, users);
      return this.party(c, id);
    });
  }
  async friends(user: string) {
    this.db.requireReady();
    const rows = await this.db.prisma.friendship.findMany({
      where: { OR: [{ sender_id: user }, { receiver_id: user }] },
      include: { sender: true, receiver: true },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        user: userView(r.sender_id === user ? r.receiver : r.sender),
        status: r.status,
        direction: r.sender_id === user ? "outgoing" : "incoming",
        sharingEnabled:
          r.sender_id === user ? r.sender_sharing : r.receiver_sharing,
      })),
    };
  }
  async requestFriend(user: string, body: any) {
    const email = text(body?.email, "email", 320).toLowerCase();
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const other = await c.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!other) throw new NotFoundException("Account not found");
      if (other.id === user) bad("Cannot request yourself");
      const id = randomUUID();
      const r = await c.friendship.createMany({
        data: [{ id, sender_id: user, receiver_id: other.id }],
        skipDuplicates: true,
      });
      if (!r.count) throw new ConflictException("Relationship already exists");
      await this.db.hint(c, "friend.changed", id, [user, other.id]);
      return { id, status: "pending" };
    });
  }
  async friendAction(user: string, id: string, enabled?: boolean) {
    uuid(id);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const r = (
        await c.$queryRaw<
          any[]
        >`SELECT * FROM friendships WHERE id=${id}::uuid FOR UPDATE`
      )[0];
      if (!r || ![r.sender_id, r.receiver_id].includes(user))
        throw new NotFoundException("Relationship not found");
      if (enabled === undefined) {
        if (r.receiver_id !== user)
          throw new ForbiddenException("Only recipient can accept");
        await c.friendship.update({
          where: { id },
          data: { status: "accepted" },
        });
      } else {
        bool(enabled);
        await c.friendship.update({
          where: { id },
          data:
            r.sender_id === user
              ? { sender_sharing: enabled }
              : { receiver_sharing: enabled },
        });
      }
      await this.db.hint(c, "friend.changed", id, [r.sender_id, r.receiver_id]);
      return { ok: true };
    });
  }
  async partySharing(user: string, id: string, enabled: boolean) {
    uuid(id);
    bool(enabled);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const [party] = await c.$queryRaw<
        { visibility: string }[]
      >`SELECT visibility FROM parties WHERE id=${id}::uuid FOR UPDATE`;
      if (
        party?.visibility === "private" &&
        !(await this.members(c, id)).includes(user)
      )
        throw new NotFoundException("Party not found");
      const r = await c.partyMember.updateMany({
        where: { party_id: id, user_id: user },
        data: { sharing_enabled: enabled },
      });
      if (!r.count) throw new ForbiddenException("Party membership required");
      await this.db.hint(c, "sharing.changed", id, await this.members(c, id));
      return { ok: true };
    });
  }
  async quests(user: string) {
    this.db.requireReady();
    const rows = await this.db.prisma.quest.findMany({
      where: { party: { members: { some: { user_id: user } } } },
      orderBy: { starts_at: "asc" },
    });
    return { items: rows.map(questView) };
  }
  async saveQuest(user: string, body: any, id?: string) {
    this.db.requireReady();
    const input = object(body);
    if (id) {
      uuid(id);
      if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1)
        bad("expectedVersion must be a positive integer");
    } else if (input.status !== undefined && input.status !== "active") {
      bad("New quests must be active");
    }
    return this.db.tx(async (c) => {
      // Lock the parent before checking membership, just as join/leave do.
      const reference = id
        ? await c.quest.findUnique({
            where: { id },
            select: { party_id: true },
          })
        : null;
      if (id && !reference) throw new NotFoundException("Quest not found");
      const partyId = uuid(reference?.party_id ?? input.partyId);
      if (input.partyId !== undefined && input.partyId !== partyId)
        bad("Quest party cannot change");
      await c.$queryRaw`SELECT id FROM parties WHERE id=${partyId}::uuid FOR UPDATE`;
      const members = await this.members(c, partyId);
      if (!members.includes(user))
        throw new ForbiddenException("Party membership required");
      // Membership mutation keeps party-first ordering; schedule edits then serialize
      // with meetup acceptance and timetable writes on the same sorted user rows.
      await lockScheduleUsers(c, members);
      const old = id
        ? (
            await c.$queryRaw<
              any[]
            >`SELECT * FROM quests WHERE id=${id}::uuid FOR UPDATE`
          )[0]
        : null;
      if (id && !old) throw new NotFoundException("Quest not found");
      if (old && input.expectedVersion !== old.version)
        throw new ConflictException({
          message: "Quest changed; reload before saving",
          code: "VERSION_CONFLICT",
        });
      if (old?.status === "cancelled")
        throw new ConflictException({
          message: "Cancelled quests are read-only",
          code: "QUEST_CANCELLED",
        });
      if (
        input.status !== undefined &&
        !["active", "cancelled"].includes(input.status)
      )
        bad("Invalid quest status");
      const cancelling = Boolean(old && input.status === "cancelled");
      if (
        cancelling &&
        Object.keys(input).some(
          (key) => !["status", "expectedVersion"].includes(key),
        )
      )
        bad("Cancellation accepts only status and expectedVersion");
      if (
        old &&
        !cancelling &&
        !["title", "startsAt", "endsAt", "locationName"].some(
          (key) => key in input,
        )
      )
        bad("At least one editable quest field is required");
      const b = { ...(old ? questView(old) : {}), ...input };
      const title = text(b.title, "title", 200),
        location = text(b.locationName, "locationName", 300),
        d = dates(b),
        questId = id || randomUUID();
      const data = {
        title,
        starts_at: new Date(d.startsAt),
        ends_at: new Date(d.endsAt),
        location_name: location,
        status: cancelling ? "cancelled" : "active",
      };
      const timeChanged =
        !old ||
        old.starts_at.getTime() !== data.starts_at.getTime() ||
        old.ends_at.getTime() !== data.ends_at.getTime();
      if (!cancelling && timeChanged)
        await assertScheduleAvailable(
          c,
          members,
          data.starts_at,
          data.ends_at,
          id,
        );
      const row = old
        ? await c.quest.update({
            where: { id: questId },
            data: { ...data, version: { increment: 1 } },
          })
        : await c.quest.create({
            data: { id: questId, party_id: partyId, ...data },
          });
      await this.db.hint(c, "quest.changed", questId, members, row.version);
      return questView(row);
    });
  }
}
function questView(r: any) {
  return {
    id: r.id,
    partyId: r.party_id,
    title: r.title,
    startsAt: r.starts_at.toISOString(),
    endsAt: r.ends_at.toISOString(),
    locationName: r.location_name,
    version: r.version,
    status: r.status,
  };
}
