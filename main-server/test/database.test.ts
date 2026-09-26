import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  Database,
  CACHE_SCRIPT,
  INVALIDATE_SCRIPT,
} from "../src/modules/database";
import { SocialService } from "../src/modules/social";
import { LocationService } from "../src/modules/location";
import { EventsService } from "../src/modules/events";

const enabled = process.env.RUN_DB_TESTS === "1";
test(
  "PostgreSQL/Redis: concurrent party capacity, match retry consumption, private membership and location consent",
  { skip: !enabled },
  async (t) => {
    const db = new Database();
    await db.onModuleInit();
    db.requireReady();
    const social = new SocialService(db),
      location = new LocationService(db),
      events = new EventsService(db);
    const users = Array.from({ length: 5 }, () => randomUUID());
    let partyIds: string[] = [];
    let eventId: string | undefined;
    try {
      for (const id of users)
        await db.pool.query(
          "INSERT INTO users(id,google_sub,email,display_name) VALUES($1::uuid,$1::text,$2,$3)",
          [id, `${id}@snu.ac.kr`, "Test only"],
        );
      const event = await events.save({
        title: "DB test event",
        description: "test fixture",
        startsAt: "2026-10-01T00:00:00Z",
        endsAt: "2026-10-01T01:00:00Z",
        locationName: "Test",
        status: "draft",
      });
      eventId = event.id;
      assert.ok(
        !(await events.list()).items.some((e: any) => e.id === eventId),
      );
      await t.test(
        "event party rejects new joins after cancellation or drafting",
        async () => {
          await events.save({ status: "published" }, eventId);
          const linked = await social.createParty(users[0], {
            title: "Linked test",
            maxMembers: 3,
            eventId,
          });
          partyIds.push(linked.id);
          for (const status of ["cancelled", "draft"]) {
            await events.save({ status }, eventId);
            await assert.rejects(
              () => social.join(users[1], linked.id),
              /Published event required/,
            );
          }
          const count = await db.pool.query(
            "SELECT count(*) FROM party_members WHERE party_id=$1",
            [linked.id],
          );
          assert.equal(Number(count.rows[0].count), 1);
        },
      );
      const p = await social.createParty(users[0], {
        title: "Capacity test",
        maxMembers: 2,
      });
      partyIds.push(p.id);
      const outcomes = await Promise.allSettled([
        social.join(users[1], p.id),
        social.join(users[2], p.id),
      ]);
      assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
      const outsider = (await social.listParties(users[4])).items.find(
        (r) => r.id === p.id,
      );
      assert.deepEqual(outsider?.members, []);
      assert.ok(!Object.hasOwn(outsider!, "sharingEnabled"));
      assert.equal(p.sharingEnabled, true);
      const request = {
        requestId: randomUUID(),
        requestIds: [randomUUID(), randomUUID()],
        userIds: [users[3], users[4]],
        timeStart: "2026-10-01T00:00:00Z",
        timeEnd: "2026-10-01T01:00:00Z",
        title: "Match test",
        maxMembers: 2,
      };
      await t.test(
        "matching rejects authoritative event outside consent interval before consuming requests",
        async () => {
          await events.save({ status: "published" }, eventId);
          await assert.rejects(
            () =>
              social.match({
                ...request,
                eventId,
                timeStart: "2026-10-01T00:30:00Z",
              }),
            /Event must fit/,
          );
          const consumed = await db.pool.query(
            "SELECT count(*) FROM consumed_match_requests WHERE request_id=ANY($1::uuid[])",
            [request.requestIds],
          );
          assert.equal(Number(consumed.rows[0].count), 0);
          await events.save({ status: "draft" }, eventId);
        },
      );
      const matched = await social.match(request);
      partyIds.push(matched.id);
      assert.equal((await social.match(request)).id, matched.id);
      await assert.rejects(
        () => social.match({ ...request, requestId: randomUUID() }),
        /already consumed/,
      );
      const member = (
        await db.pool.query(
          "SELECT user_id FROM party_members WHERE party_id=$1 AND user_id<>$2",
          [p.id, users[0]],
        )
      ).rows[0].user_id;
      await location.sharing(users[0], true);
      await location.sharing(member, true);
      await location.upload(users[0], {
        latitude: 37.46,
        longitude: 126.95,
        accuracyM: 10,
        observedAt: new Date().toISOString(),
      });
      assert.equal((await location.list(member)).items.length, 1);
      await t.test(
        "delayed offset-formatted location cannot overwrite newer position or publish a hint",
        async () => {
          const before = await db.pool.query(
            "SELECT count(*) FROM outbox WHERE envelope->>'type'='location.changed' AND envelope->>'entityId'=$1",
            [users[0]],
          );
          const previous = await db.redis.get(`prototype:location:${users[0]}`);
          const old = new Date(Date.now() - 30000);
          const offset = new Date(old.getTime() + 9 * 3600000)
            .toISOString()
            .replace("Z", "+09:00");
          await location.upload(users[0], {
            latitude: 1,
            longitude: 1,
            accuracyM: 5,
            observedAt: offset,
          });
          assert.equal(
            await db.redis.get(`prototype:location:${users[0]}`),
            previous,
          );
          const after = await db.pool.query(
            "SELECT count(*) FROM outbox WHERE envelope->>'type'='location.changed' AND envelope->>'entityId'=$1",
            [users[0]],
          );
          assert.equal(after.rows[0].count, before.rows[0].count);
        },
      );
      await social.partySharing(member, p.id, false);
      assert.equal(
        (await social.listParties(member)).items.find((r) => r.id === p.id)
          ?.sharingEnabled,
        false,
      );
      assert.deepEqual((await location.list(member)).items, []);
      await social.partySharing(member, p.id, true);
      await location.sharing(users[0], false);
      assert.deepEqual((await location.list(member)).items, []);
      await assert.rejects(
        () =>
          location.upload(users[0], {
            latitude: 37.46,
            longitude: 126.95,
            accuracyM: 10,
            observedAt: new Date().toISOString(),
          }),
        /Enable location/,
      );
      // A stale snapshot cannot overwrite a more recent invalidation floor.
      const cache = `test:${randomUUID()}`,
        floor = `${cache}:revision`;
      await db.redis.eval(INVALIDATE_SCRIPT, 2, cache, floor, "10");
      assert.equal(
        await db.redis.eval(CACHE_SCRIPT, 2, cache, floor, "9", "stale"),
        0,
      );
      assert.equal(await db.redis.get(cache), null);
      await db.redis.del(cache, floor);
    } finally {
      await db.pool.query(
        "DELETE FROM consumed_match_requests WHERE user_id=ANY($1::uuid[])",
        [users],
      );
      await db.pool.query(
        "DELETE FROM match_batches WHERE party_id=ANY($1::uuid[])",
        [partyIds],
      );
      await db.pool.query("DELETE FROM parties WHERE id=ANY($1::uuid[])", [
        partyIds,
      ]);
      await db.pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [
        users,
      ]);
      if (eventId)
        await db.pool.query("DELETE FROM events WHERE id=$1", [eventId]);
      await db.redis.del(...users.map((id) => `prototype:location:${id}`));
      await db.onModuleDestroy();
    }
  },
);
