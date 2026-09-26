import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Meetup, Prisma } from "../generated/prisma/client";
import { Database, Transaction } from "./database";
import {
  assertScheduleAvailable,
  lockScheduleUsers,
  validateScheduleWindow,
} from "./schedule-conflicts";
import { userView } from "./auth";
import { bad, exactTime, object, text, uuid } from "./validation";

function fields(body: Record<string, any>, allowed: string[]) {
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    bad("Unknown field");
}
export function meetupInput(value: unknown) {
  const b = object(value);
  fields(b, ["friendId", "title", "startsAt", "endsAt", "locationName"]);
  const starts_at = exactTime(b.startsAt, "startsAt"),
    ends_at = exactTime(b.endsAt, "endsAt");
  if (starts_at.getTime() <= Date.now()) bad("Meetup must start in the future");
  if (ends_at <= starts_at) bad("endsAt must follow startsAt");
  validateScheduleWindow(starts_at, ends_at);
  return {
    friendId: uuid(b.friendId).toLowerCase(),
    title: text(b.title, "title", 200),
    starts_at,
    ends_at,
    location_name: text(b.locationName, "locationName", 300),
  };
}
export function meetupResponseInput(value: unknown) {
  const b = object(value);
  fields(b, ["action", "expectedVersion"]);
  if (!["accept", "decline", "cancel"].includes(b.action))
    bad("Invalid meetup action");
  if (
    !Number.isInteger(b.expectedVersion) ||
    b.expectedVersion < 1 ||
    b.expectedVersion > 2147483646
  )
    bad("expectedVersion must be a positive integer");
  return {
    action: b.action as "accept" | "decline" | "cancel",
    expectedVersion: b.expectedVersion as number,
  };
}
const participants = { sender: true, recipient: true } as const;
type MeetupWithPeople = Prisma.MeetupGetPayload<{
  include: typeof participants;
}>;
function view(row: MeetupWithPeople) {
  return {
    id: row.id,
    sender: userView(row.sender),
    recipient: userView(row.recipient),
    title: row.title,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    locationName: row.location_name,
    status: row.status,
    version: row.version,
    partyId: row.party_id,
    questId: row.quest_id,
    createdAt: row.created_at.toISOString(),
  };
}
function conflict(code = "VERSION_CONFLICT"): never {
  throw new ConflictException({
    code,
    message:
      code === "MEETUP_EXPIRED"
        ? "Meetup invitation expired"
        : "Meetup changed; reload before responding",
  });
}
@Injectable()
export class MeetupsService {
  constructor(private db: Database) {}
  private hint(c: Transaction, row: Meetup) {
    return this.db.hint(
      c,
      "meetup.changed",
      row.id,
      [row.sender_id, row.recipient_id],
      row.version,
    );
  }
  async list(user: string) {
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const own = { OR: [{ sender_id: user }, { recipient_id: user }] };
      // Expiration is evaluated when participants fetch/respond; there is no push scheduler.
      const expired = await c.meetup.updateManyAndReturn({
        where: { ...own, status: "pending", starts_at: { lte: new Date() } },
        data: { status: "expired", version: { increment: 1 } },
      });
      for (const row of expired) await this.hint(c, row);
      const rows = await c.meetup.findMany({
        where: own,
        include: participants,
        orderBy: { created_at: "desc" },
      });
      return { items: rows.map(view) };
    });
  }
  async create(user: string, body: unknown) {
    const { friendId, ...data } = meetupInput(body);
    if (friendId === user) bad("Cannot invite yourself");
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const accepted = await c.$queryRaw<
        { id: string }[]
      >`SELECT id FROM friendships WHERE status='accepted' AND ((sender_id=${user}::uuid AND receiver_id=${friendId}::uuid) OR (sender_id=${friendId}::uuid AND receiver_id=${user}::uuid)) FOR SHARE`;
      if (!accepted.length)
        throw new ForbiddenException("Accepted friendship required");
      const row = await c.meetup.create({
        data: {
          id: randomUUID(),
          sender_id: user,
          recipient_id: friendId,
          ...data,
        },
        include: participants,
      });
      await this.hint(c, row);
      return view(row);
    });
  }
  async respond(user: string, id: string, body: unknown) {
    uuid(id);
    const { action, expectedVersion } = meetupResponseInput(body);
    this.db.requireReady();
    const result = await this.db.tx(async (c) => {
      const [row] = await c.$queryRaw<
        Meetup[]
      >`SELECT * FROM meetups WHERE id=${id}::uuid FOR UPDATE`;
      if (!row || ![row.sender_id, row.recipient_id].includes(user))
        throw new NotFoundException("Meetup not found");
      if (
        (action === "cancel" && user !== row.sender_id) ||
        (action !== "cancel" && user !== row.recipient_id)
      )
        throw new ForbiddenException(
          "Only the invited recipient can accept/decline; only the sender can cancel",
        );
      const outcome = {
        accept: "accepted",
        decline: "declined",
        cancel: "cancelled",
      }[action];
      // A lost response can be retried with its original version without creating duplicates.
      if (row.status === outcome)
        return {
          item: view(
            await c.meetup.findUniqueOrThrow({
              where: { id },
              include: participants,
            }),
          ),
          expired: false,
        };
      if (row.status === "pending" && row.starts_at.getTime() <= Date.now()) {
        const expired = await c.meetup.update({
          where: { id },
          data: { status: "expired", version: { increment: 1 } },
        });
        await this.hint(c, expired);
        return { item: null, expired: true };
      }
      if (row.status === "expired") return { item: null, expired: true };
      if (row.status !== "pending" || row.version !== expectedVersion)
        conflict();
      let party_id: string | null = null,
        quest_id: string | null = null;
      if (action === "accept") {
        // Acceptance consents to this exact immutable proposal. Any conflict checks belong here,
        // before creating the private party/quest, inside the same transaction.
        const users = [row.sender_id, row.recipient_id];
        await lockScheduleUsers(c, users);
        if (row.starts_at.getTime() <= Date.now()) {
          const expired = await c.meetup.update({
            where: { id },
            data: { status: "expired", version: { increment: 1 } },
          });
          await this.hint(c, expired);
          return { item: null, expired: true };
        }
        const accepted = await c.$queryRaw<
          { id: string }[]
        >`SELECT id FROM friendships WHERE status='accepted' AND ((sender_id=${row.sender_id}::uuid AND receiver_id=${row.recipient_id}::uuid) OR (sender_id=${row.recipient_id}::uuid AND receiver_id=${row.sender_id}::uuid)) FOR SHARE`;
        if (!accepted.length)
          throw new ForbiddenException("Accepted friendship required");
        await assertScheduleAvailable(c, users, row.starts_at, row.ends_at);
        party_id = randomUUID();
        quest_id = randomUUID();
        await c.party.create({
          data: {
            id: party_id,
            title: row.title,
            max_members: 2,
            visibility: "private",
          },
        });
        await c.partyMember.createMany({
          data: [row.sender_id, row.recipient_id].map((user_id) => ({
            party_id: party_id!,
            user_id,
          })),
        });
        await c.quest.create({
          data: {
            id: quest_id,
            party_id,
            title: row.title,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            location_name: row.location_name,
            status: "active",
          },
        });
        await this.db.hint(c, "party.changed", party_id, [
          row.sender_id,
          row.recipient_id,
        ]);
        await this.db.hint(
          c,
          "quest.changed",
          quest_id,
          [row.sender_id, row.recipient_id],
          1,
        );
      }
      const changed = await c.meetup.update({
        where: { id },
        data: {
          status: outcome,
          version: { increment: 1 },
          party_id,
          quest_id,
        },
        include: participants,
      });
      await this.hint(c, changed);
      return { item: view(changed), expired: false };
    });
    // Persist lazy expiry and its private hint before reporting the rejected response.
    if (result.expired) conflict("MEETUP_EXPIRED");
    return result.item!;
  }
}
