import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PoolClient } from "pg";
import { randomUUID, createHash } from "node:crypto";
import { Database } from "./database";
import { userView } from "./auth";
import { bad, bool, capacity, dates, object, text, uuid } from "./validation";
export function ensureCapacity(current: number, incoming: number, max: number) {
  if (current + incoming > max) throw new ConflictException("Party is full");
}
@Injectable()
export class SocialService {
  constructor(private db: Database) {}
  async members(c: PoolClient, id: string) {
    return (
      await c.query("SELECT user_id FROM party_members WHERE party_id=$1", [id])
    ).rows.map((r) => r.user_id as string);
  }
  async party(c: PoolClient, id: string, viewer?: string) {
    const row = (await c.query("SELECT * FROM parties WHERE id=$1", [id]))
      .rows[0];
    if (!row) throw new NotFoundException("Party not found");
    const memberRows = (
      await c.query(
        "SELECT user_id,sharing_enabled FROM party_members WHERE party_id=$1",
        [id],
      )
    ).rows;
    const memberIds = memberRows.map((r) => r.user_id);
    const ownMembership = memberRows.find((r) => r.user_id === viewer);
    const members =
      viewer && !memberIds.includes(viewer)
        ? []
        : (
            await c.query(
              "SELECT u.* FROM users u JOIN party_members m ON m.user_id=u.id WHERE m.party_id=$1 ORDER BY u.id",
              [id],
            )
          ).rows.map(userView);
    return {
      id: row.id,
      title: row.title,
      eventId: row.event_id,
      maxMembers: row.max_members,
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
      const ids = (
        await c.query(
          "SELECT id FROM parties ORDER BY created_at DESC LIMIT 100",
        )
      ).rows;
      const items = [];
      for (const row of ids) items.push(await this.party(c, row.id, user));
      return { items };
    });
  }
  async validateEvent(c: PoolClient, eventId: string | null) {
    if (!eventId) return null;
    const event = (
      await c.query(
        "SELECT * FROM events WHERE id=$1 AND status='published' FOR SHARE",
        [eventId],
      )
    ).rows[0];
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
      await c.query(
        "INSERT INTO parties(id,title,event_id,max_members) VALUES($1,$2,$3,$4)",
        [id, title, eventId, max],
      );
      await c.query(
        "INSERT INTO party_members(party_id,user_id) VALUES($1,$2)",
        [id, user],
      );
      await this.db.hint(c, "party.changed", id, [user]);
      return this.party(c, id, user);
    });
  }
  async join(user: string, id: string) {
    uuid(id);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const r = (
        await c.query("SELECT * FROM parties WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!r) throw new NotFoundException("Party not found");
      const ids = await this.members(c, id);
      if (!ids.includes(user)) {
        await this.validateEvent(c, r.event_id);
        ensureCapacity(ids.length, 1, r.max_members);
        await c.query(
          "INSERT INTO party_members(party_id,user_id) VALUES($1,$2)",
          [id, user],
        );
        await this.db.hint(c, "party.changed", id, [...ids, user]);
      }
      return this.party(c, id, user);
    });
  }
  async leave(user: string, id: string) {
    uuid(id);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      await c.query("SELECT id FROM parties WHERE id=$1 FOR UPDATE", [id]);
      const ids = await this.members(c, id);
      await c.query(
        "DELETE FROM party_members WHERE party_id=$1 AND user_id=$2",
        [id, user],
      );
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
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        requestId,
      ]);
      const prior = (
        await c.query("SELECT * FROM match_batches WHERE request_id=$1", [
          requestId,
        ])
      ).rows[0];
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new ConflictException("Request id already has different input");
        return this.party(c, prior.party_id);
      }
      // Lock users consistently, then consumption check is serial even across different batch IDs.
      const found = await c.query(
        "SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
        [users],
      );
      if (found.rows.length !== users.length) bad("Unknown matching user");
      if (
        (
          await c.query(
            "SELECT request_id FROM consumed_match_requests WHERE request_id=ANY($1::uuid[])",
            [requests],
          )
        ).rowCount
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
      await c.query(
        "INSERT INTO parties(id,title,event_id,max_members) VALUES($1,$2,$3,$4)",
        [id, title, eventId, max],
      );
      for (let i = 0; i < users.length; i++) {
        await c.query(
          "INSERT INTO party_members(party_id,user_id) VALUES($1,$2)",
          [id, users[i]],
        );
        await c.query(
          "INSERT INTO consumed_match_requests(request_id,user_id,party_id) VALUES($1,$2,$3)",
          [requests[i], users[i], id],
        );
      }
      await c.query(
        "INSERT INTO match_batches(request_id,party_id,fingerprint) VALUES($1,$2,$3)",
        [requestId, id, fingerprint],
      );
      await this.db.hint(c, "party.changed", id, users);
      return this.party(c, id);
    });
  }
  async friends(user: string) {
    this.db.requireReady();
    const r = await this.db.pool.query(
      `SELECT f.*,row_to_json(u) AS other FROM friendships f JOIN users u ON u.id=CASE WHEN f.sender_id=$1 THEN f.receiver_id ELSE f.sender_id END WHERE f.sender_id=$1 OR f.receiver_id=$1`,
      [user],
    );
    return {
      items: r.rows.map((r) => ({
        id: r.id,
        user: userView(r.other),
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
      const other = (
        await c.query("SELECT id FROM users WHERE email=$1", [email])
      ).rows[0];
      if (!other) throw new NotFoundException("Account not found");
      if (other.id === user) bad("Cannot request yourself");
      const id = randomUUID();
      const r = await c.query(
        "INSERT INTO friendships(id,sender_id,receiver_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id",
        [id, user, other.id],
      );
      if (!r.rowCount)
        throw new ConflictException("Relationship already exists");
      await this.db.hint(c, "friend.changed", id, [user, other.id]);
      return { id, status: "pending" };
    });
  }
  async friendAction(user: string, id: string, enabled?: boolean) {
    uuid(id);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      const r = (
        await c.query("SELECT * FROM friendships WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!r || ![r.sender_id, r.receiver_id].includes(user))
        throw new NotFoundException("Relationship not found");
      if (enabled === undefined) {
        if (r.receiver_id !== user)
          throw new ForbiddenException("Only recipient can accept");
        await c.query("UPDATE friendships SET status='accepted' WHERE id=$1", [
          id,
        ]);
      } else {
        bool(enabled);
        await c.query(
          `UPDATE friendships SET ${r.sender_id === user ? "sender_sharing" : "receiver_sharing"}=$2 WHERE id=$1`,
          [id, enabled],
        );
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
      await c.query("SELECT id FROM parties WHERE id=$1 FOR UPDATE", [id]);
      const r = await c.query(
        "UPDATE party_members SET sharing_enabled=$3 WHERE party_id=$1 AND user_id=$2",
        [id, user, enabled],
      );
      if (!r.rowCount)
        throw new ForbiddenException("Party membership required");
      await this.db.hint(c, "sharing.changed", id, await this.members(c, id));
      return { ok: true };
    });
  }
  async quests(user: string) {
    this.db.requireReady();
    const r = await this.db.pool.query(
      "SELECT q.* FROM quests q JOIN party_members m ON m.party_id=q.party_id WHERE m.user_id=$1 ORDER BY q.starts_at",
      [user],
    );
    return { items: r.rows.map(questView) };
  }
  async saveQuest(user: string, body: any, id?: string) {
    this.db.requireReady();
    if (id) uuid(id);
    return this.db.tx(async (c) => {
      const old = id
        ? (await c.query("SELECT * FROM quests WHERE id=$1 FOR UPDATE", [id]))
            .rows[0]
        : null;
      if (id && !old) throw new NotFoundException("Quest not found");
      const b = { ...(old ? questView(old) : {}), ...object(body) },
        partyId = uuid(b.partyId);
      if (old && partyId !== old.party_id) bad("Quest party cannot change");
      await c.query("SELECT id FROM parties WHERE id=$1 FOR UPDATE", [partyId]);
      const members = await this.members(c, partyId);
      if (!members.includes(user))
        throw new ForbiddenException("Party membership required");
      const title = text(b.title, "title", 200),
        location = text(b.locationName, "locationName", 300),
        d = dates(b),
        questId = id || randomUUID();
      const r = await c.query(
        "INSERT INTO quests(id,party_id,title,starts_at,ends_at,location_name) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET title=$3,starts_at=$4,ends_at=$5,location_name=$6,version=quests.version+1 RETURNING *",
        [questId, partyId, title, d.startsAt, d.endsAt, location],
      );
      await this.db.hint(
        c,
        "quest.changed",
        questId,
        members,
        r.rows[0].version,
      );
      return questView(r.rows[0]);
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
  };
}
