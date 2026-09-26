import {
  Injectable,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Database } from "./database";
import { bool, number, time, object, bad } from "./validation";
import { userView } from "./auth";
export function mayShare(
  globalA: boolean,
  globalB: boolean,
  friend: { accepted: boolean; bothOn: boolean } | null,
  parties: boolean[],
): boolean {
  if (!globalA || !globalB) return false;
  if (friend?.accepted && friend.bothOn) return true;
  // Reverse friend-OFF/party-ON and mixed-party overlaps remain unresolved: deny.
  if (friend?.accepted) return false;
  return parties.length > 0 && parties.every(Boolean);
}
@Injectable()
export class LocationService {
  constructor(private db: Database) {}
  async related(user: string) {
    const friends = await this.db.prisma.friendship.findMany({
      where: { OR: [{ sender_id: user }, { receiver_id: user }] },
    });
    const members = await this.db.prisma.partyMember.findMany({
      where: { party: { members: { some: { user_id: user } } } },
      select: { user_id: true },
    });
    return [
      ...new Set([
        user,
        ...friends.map((r) =>
          r.sender_id === user ? r.receiver_id : r.sender_id,
        ),
        ...members.map((r) => r.user_id),
      ]),
    ];
  }
  async sharing(user: string, enabled: boolean) {
    bool(enabled);
    this.db.requireReady();
    const recipients = await this.related(user);
    return this.db.tx(async (c) => {
      await c.$queryRaw`SELECT id FROM users WHERE id=${user}::uuid FOR UPDATE`;
      await c.user.update({
        where: { id: user },
        data: { location_sharing: enabled, location_epoch: { increment: 1 } },
      });
      if (!enabled) {
        try {
          await this.db.redis.del(`prototype:location:${user}`);
        } catch {
          /* PG consent immediately denies reads even if Redis is offline. */
        }
      }
      await this.db.hint(c, "sharing.changed", user, recipients);
      return { enabled };
    });
  }
  async upload(user: string, body: any) {
    const b = object(body),
      latitude = number(b.latitude, "latitude", -90, 90),
      longitude = number(b.longitude, "longitude", -180, 180),
      accuracyM = number(b.accuracyM, "accuracyM", 0, 1000),
      observedAt = time(b.observedAt, "observedAt");
    const age = Date.now() - Date.parse(observedAt);
    if (age > 120000 || age < -30000)
      bad("Location observation must be recent");
    this.db.requireReady();
    const recipients = await this.related(user);
    return this.db.tx(async (c) => {
      const r = (
        await c.$queryRaw<
          { location_sharing: boolean; location_epoch: number }[]
        >`SELECT location_sharing,location_epoch FROM users WHERE id=${user}::uuid FOR UPDATE`
      )[0];
      if (!r?.location_sharing)
        throw new ForbiddenException("Enable location sharing before upload");
      let accepted: unknown;
      try {
        // time() canonicalizes UTC; numeric milliseconds order new stored positions.
        // Legacy entries already contain canonical UTC and expire within 120 seconds.
        // Ignore delayed uploads so a slow request cannot move a marker backwards in time.
        accepted = await this.db.redis.eval(
          `local previous=redis.call('GET',KEYS[1]);if previous then local old=cjson.decode(previous);if old.epoch==tonumber(ARGV[4]) and ((old.observedAtMs and old.observedAtMs>=tonumber(ARGV[3])) or (not old.observedAtMs and old.observedAt>=ARGV[1])) then return 0;end;end;redis.call('SET',KEYS[1],ARGV[2],'EX',120);return 1`,
          1,
          `prototype:location:${user}`,
          observedAt,
          JSON.stringify({
            latitude,
            longitude,
            accuracyM,
            observedAt,
            observedAtMs: Date.parse(observedAt),
            epoch: r.location_epoch,
          }),
          String(Date.parse(observedAt)),
          String(r.location_epoch),
        );
      } catch {
        throw new ServiceUnavailableException(
          "Location storage temporarily unavailable",
        );
      }
      if (accepted === 1)
        await this.db.hint(c, "location.changed", user, recipients);
      return { ok: true };
    });
  }
  async list(user: string) {
    this.db.requireReady();
    return this.db.tx(async (c) => {
      // Fresh authoritative consent, never a cached authorization decision.
      const me = await c.user.findUnique({
        where: { id: user },
        select: { location_sharing: true },
      });
      if (!me?.location_sharing) return { items: [] };
      const friends = await c.friendship.findMany({
        where: {
          status: "accepted",
          OR: [{ sender_id: user }, { receiver_id: user }],
        },
      });
      const parties = await c.$queryRaw<
        { user_id: string; mine: boolean; theirs: boolean }[]
      >`
        SELECT b.user_id,a.sharing_enabled AS mine,b.sharing_enabled AS theirs
        FROM party_members a JOIN party_members b ON a.party_id=b.party_id
        WHERE a.user_id=${user}::uuid AND b.user_id<>${user}::uuid`;
      const ids = [
        ...new Set([
          ...friends.map((r) =>
            r.sender_id === user ? r.receiver_id : r.sender_id,
          ),
          ...parties.map((r) => r.user_id),
        ]),
      ];
      if (!ids.length) return { items: [] };
      const users = await c.user.findMany({ where: { id: { in: ids } } });
      const permitted = users.filter((other) => {
        const f = friends.find(
          (r) => r.sender_id === other.id || r.receiver_id === other.id,
        );
        return mayShare(
          true,
          other.location_sharing,
          f
            ? { accepted: true, bothOn: f.sender_sharing && f.receiver_sharing }
            : null,
          parties
            .filter((r) => r.user_id === other.id)
            .map((r) => r.mine && r.theirs),
        );
      });
      if (!permitted.length) return { items: [] };
      let positions: (string | null)[];
      try {
        positions = await this.db.redis.mget(
          permitted.map((r) => `prototype:location:${r.id}`),
        );
      } catch {
        throw new ServiceUnavailableException(
          "Location storage temporarily unavailable",
        );
      }
      return {
        items: positions.flatMap((value, i) => {
          if (!value) return [];
          const p = JSON.parse(value);
          if (
            Date.now() - Date.parse(p.observedAt) > 120000 ||
            p.epoch !== permitted[i].location_epoch
          )
            return [];
          delete p.epoch;
          delete p.observedAtMs;
          return [{ user: userView(permitted[i]), ...p }];
        }),
      };
    });
  }
}
