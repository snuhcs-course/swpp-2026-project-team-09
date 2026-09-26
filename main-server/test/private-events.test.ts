import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { privateEventInput } from "../src/modules/private-events";

const input = () => ({
  title: "Private fixture",
  description: "",
  startsAt: "2026-01-01T23:30:00+09:00",
  endsAt: "2026-01-02T00:30:00+09:00",
  locationName: "",
});
test("private calendar validation accepts past/cross-midnight times and rejects malformed input", () => {
  const valid = privateEventInput(input());
  assert.equal(valid.starts_at.toISOString(), "2026-01-01T14:30:00.000Z");
  assert.equal(valid.ends_at.toISOString(), "2026-01-01T15:30:00.000Z");
  assert.equal(valid.latitude, null);
  assert.equal(valid.longitude, null);
  for (const patch of [
    { ownerId: randomUUID() },
    { owner_id: randomUUID() },
    { public: true },
    { status: "published" },
    { title: " " },
    { title: "x".repeat(201) },
    { description: "x".repeat(5001) },
    { description: null },
    { locationName: "x".repeat(301) },
    { locationName: null },
    { startsAt: "2026-02-29T00:00:00Z" },
    { startsAt: "2026-04-31T00:00:00Z" },
    { startsAt: "2026-01-01T24:00:00Z" },
    { startsAt: "2026-01-01T00:00:00" },
    { endsAt: "2026-01-01T23:30:00+09:00" },
    { endsAt: "2026-03-01T00:00:00Z" },
    { latitude: 37 },
    { latitude: null, longitude: 127 },
    { latitude: 91, longitude: 127 },
    { latitude: 37, longitude: 181 },
    { latitude: "37", longitude: 127 },
    { latitude: Infinity, longitude: 127 },
  ])
    assert.throws(
      () => privateEventInput({ ...input(), ...patch }),
      (e: any) => e.getStatus?.() === 400,
    );
  const located = privateEventInput({
    ...input(),
    latitude: 37.46,
    longitude: 126.95,
  });
  assert.equal(located.latitude, 37.46);
});

test(
  "owner-only private calendar HTTP CRUD, versions, hints and schedule consumption",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async (t) => {
    const { NestFactory } = require("@nestjs/core");
    const {
      AppModule,
      Errors,
      runtimeControllers,
      PublicController,
    } = require("../dist/modules/http");
    const { Database } = require("../dist/modules/database");
    const { SocialService } = require("../dist/modules/social");
    process.env.JWT_SECRET = "private-calendar-integration-only";
    const users = [randomUUID(), randomUUID(), randomUUID()];
    process.env.ADMIN_EMAILS = `${users[2]}@snu.ac.kr`;
    const app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new Errors());
    await app.listen(0, "127.0.0.1");
    const db = app.get(Database),
      social = app.get(SocialService),
      base = await app.getUrl();
    const ids: string[] = [],
      parties: string[] = [];
    async function request(
      user: string | null,
      path: string,
      method = "GET",
      body?: any,
    ) {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (user)
        headers.authorization = `Bearer ${jwt.sign({}, process.env.JWT_SECRET!, { subject: user, expiresIn: "1h" })}`;
      const r = await fetch(`${base}/v1${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: r.status, body: (await r.json()) as any };
    }
    async function create(owner = users[0], body: any = input()) {
      const r = await request(owner, "/private-events", "POST", body);
      assert.equal(r.status, 201, JSON.stringify(r.body));
      ids.push(r.body.id);
      return r.body;
    }
    try {
      await db.prisma.user.createMany({
        data: users.map((id) => ({
          id,
          google_sub: id,
          email: `${id}@snu.ac.kr`,
          display_name: "Calendar fixture",
        })),
      });
      await t.test(
        "private rows never enter public feeds and an admin role cannot bypass ownership",
        async () => {
          assert.equal((await request(null, "/private-events")).status, 401);
          assert.ok(!runtimeControllers("admin").includes(PublicController));
          const title = "'); DROP TABLE users; --";
          const event = await create(users[0], {
            ...input(),
            title,
            description: "Secret details",
            latitude: 37.46,
            longitude: 126.95,
          });
          assert.equal(event.title, title);
          assert.equal(event.version, 1);
          assert.ok(event.createdAt);
          assert.ok(event.updatedAt);
          assert.equal(Object.hasOwn(event, "owner_id"), false);
          assert.deepEqual(
            (await request(users[1], "/private-events")).body.items,
            [],
          );
          assert.equal(
            (await request(users[0], "/private-events")).body.items[0].title,
            title,
          );
          for (const outsider of [users[1], users[2]]) {
            assert.equal(
              (
                await request(
                  outsider,
                  `/private-events/${event.id}`,
                  "PATCH",
                  { expectedVersion: 1, title: "Attack" },
                )
              ).status,
              404,
            );
            assert.equal(
              (
                await request(
                  outsider,
                  `/private-events/${event.id}`,
                  "DELETE",
                  { expectedVersion: 1 },
                )
              ).status,
              404,
            );
          }
          assert.equal(
            (
              await request(users[0], "/private-events", "POST", {
                ...input(),
                ownerId: users[1],
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(users[0], `/private-events/${event.id}`, "PATCH", {
                expectedVersion: 1,
                status: "published",
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(users[0], `/private-events/${event.id}`, "DELETE", {
                expectedVersion: 1,
                ownerId: users[1],
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(users[0], "/private-events/not-a-uuid", "PATCH", {
                expectedVersion: 1,
                title: "Attack",
              })
            ).status,
            400,
          );
          assert.equal(
            (await request(users[0], "/events")).body.items.some(
              (e: any) => e.id === event.id,
            ),
            false,
          );
          assert.equal(
            (await request(users[0], "/parties")).body.items.some(
              (e: any) => e.id === event.id,
            ),
            false,
          );
          assert.equal(
            await db.prisma.event.count({ where: { id: event.id } }),
            0,
          );
          assert.equal(
            await db.prisma.user.count({ where: { id: { in: users } } }),
            3,
          );
          const cleared = await request(
            users[0],
            `/private-events/${event.id}`,
            "PATCH",
            { expectedVersion: 1, latitude: null, longitude: null },
          );
          assert.equal(cleared.status, 200);
          assert.equal(cleared.body.latitude, null);
          assert.equal(cleared.body.longitude, null);
          assert.equal(cleared.body.description, "Secret details");
          assert.equal(
            (
              await request(users[0], `/private-events/${event.id}`, "PATCH", {
                expectedVersion: 2,
                latitude: 37,
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        "same-version writes have one winner; deletion emits a private data-free tombstone",
        async () => {
          const event = await create();
          for (const body of [
            { title: "Missing version" },
            { expectedVersion: 0, title: "Bad" },
            { expectedVersion: 1 },
          ])
            assert.equal(
              (
                await request(
                  users[0],
                  `/private-events/${event.id}`,
                  "PATCH",
                  body,
                )
              ).status,
              400,
            );
          const results = await Promise.all(
            ["One", "Two"].map((title) =>
              request(users[0], `/private-events/${event.id}`, "PATCH", {
                expectedVersion: 1,
                title,
              }),
            ),
          );
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            results.find((r) => r.status === 409)!.body.code,
            "VERSION_CONFLICT",
          );
          assert.equal(
            (
              await request(users[0], `/private-events/${event.id}`, "DELETE", {
                expectedVersion: 1,
              })
            ).status,
            409,
          );
          const removed = await request(
            users[0],
            `/private-events/${event.id}`,
            "DELETE",
            { expectedVersion: 2 },
          );
          assert.deepEqual(removed, { status: 200, body: { ok: true } });
          assert.equal(
            (await request(users[0], "/private-events")).body.items.some(
              (e: any) => e.id === event.id,
            ),
            false,
          );
          const hints = await db.prisma.outbox.findMany({
            where: { envelope: { path: ["entityId"], equals: event.id } },
            orderBy: { sequence: "asc" },
          });
          assert.equal(hints.length, 3);
          assert.deepEqual(
            hints.map((h: any) => h.envelope.version),
            [1, 2, 3],
          );
          for (const h of hints) {
            assert.equal(h.envelope.type, "private-event.changed");
            assert.deepEqual(h.envelope.audience, {
              kind: "users",
              userIds: [users[0]],
            });
            assert.deepEqual(Object.keys(h.envelope).sort(), [
              "audience",
              "entityId",
              "id",
              "type",
              "version",
            ]);
          }
        },
      );
      await t.test(
        "simultaneous update/delete cannot silently overwrite or resurrect removed rows",
        async () => {
          const event = await create();
          const results = await Promise.all([
            request(users[0], `/private-events/${event.id}`, "PATCH", {
              expectedVersion: 1,
              title: "Changed",
            }),
            request(users[0], `/private-events/${event.id}`, "DELETE", {
              expectedVersion: 1,
            }),
          ]);
          assert.equal(results.filter((r) => r.status === 200).length, 1);
          assert.ok(
            [404, 409].includes(results.find((r) => r.status !== 200)!.status),
          );
          const row = await db.prisma.privateEvent.findUnique({
            where: { id: event.id },
          });
          if (row) {
            assert.equal(row.version, 2);
            assert.equal(row.title, "Changed");
          } else assert.deepEqual(results[1].body, { ok: true });
        },
      );
      await t.test(
        "private busy time blocks a pending meetup generically; removing it allows acceptance",
        async () => {
          const friendship = await social.requestFriend(users[0], {
            email: `${users[1]}@snu.ac.kr`,
          });
          await social.friendAction(users[1], friendship.id);
          const startsAt = new Date(Date.now() + 8 * 86400000).toISOString(),
            endsAt = new Date(
              Date.now() + 8 * 86400000 + 3600000,
            ).toISOString();
          const secret = await create(users[1], {
            ...input(),
            title: "Private medical visit",
            description: "Do not disclose",
            startsAt,
            endsAt,
          });
          const proposed = await request(users[0], "/meetups", "POST", {
            friendId: users[1],
            title: "Meetup",
            startsAt,
            endsAt,
            locationName: "Cafe",
          });
          assert.equal(proposed.status, 201);
          const path = `/meetups/${proposed.body.id}/respond`;
          const rejected = await request(users[1], path, "POST", {
            action: "accept",
            expectedVersion: 1,
          });
          assert.equal(rejected.status, 409);
          assert.equal(rejected.body.code, "SCHEDULE_CONFLICT");
          assert.equal(
            JSON.stringify(rejected.body).includes("medical"),
            false,
          );
          assert.equal(
            (await request(users[0], "/private-events")).body.items.some(
              (e: any) => e.id === secret.id,
            ),
            false,
          );
          assert.equal(
            (
              await request(
                users[1],
                `/private-events/${secret.id}`,
                "DELETE",
                { expectedVersion: 1 },
              )
            ).status,
            200,
          );
          const accepted = await request(users[1], path, "POST", {
            action: "accept",
            expectedVersion: 1,
          });
          assert.equal(accepted.status, 201);
          parties.push(accepted.body.partyId);
          // Source calendar edits can introduce overlap without silently moving accepted quests.
          const another = await create(users[1], {
            ...input(),
            startsAt,
            endsAt,
          });
          assert.equal(another.version, 1);
          const unchanged = await db.prisma.quest.findUniqueOrThrow({
            where: { id: accepted.body.questId },
          });
          assert.equal(unchanged.starts_at.toISOString(), startsAt);
          assert.equal(unchanged.version, 1);
          const party = await social.createParty(users[1], {
            title: "Other plan",
            maxMembers: 2,
          });
          parties.push(party.id);
          const blocked = await request(users[1], "/quests", "POST", {
            partyId: party.id,
            title: "Busy",
            startsAt,
            endsAt,
            locationName: "Cafe",
          });
          assert.equal(blocked.status, 409);
          assert.equal(blocked.body.code, "SCHEDULE_CONFLICT");
          // Half-open endpoints allow an adjacent event and quest.
          const nextEnd = new Date(Date.parse(endsAt) + 3600000).toISOString();
          const adjacent = await request(users[1], "/quests", "POST", {
            partyId: party.id,
            title: "Adjacent",
            startsAt: endsAt,
            endsAt: nextEnd,
            locationName: "Cafe",
          });
          assert.equal(adjacent.status, 201);
        },
      );
    } finally {
      const meetups = await db.prisma.meetup.findMany({
        where: { sender_id: users[0] },
      });
      await db.prisma.meetup.deleteMany({ where: { sender_id: users[0] } });
      const quests = await db.prisma.quest.findMany({
        where: { party_id: { in: parties } },
      });
      await db.prisma.quest.deleteMany({
        where: { party_id: { in: parties } },
      });
      await db.prisma.party.deleteMany({ where: { id: { in: parties } } });
      await db.prisma.privateEvent.deleteMany({
        where: { owner_id: { in: users } },
      });
      await db.prisma.friendship.deleteMany({
        where: {
          OR: [{ sender_id: { in: users } }, { receiver_id: { in: users } }],
        },
      });
      await db.prisma.user.deleteMany({ where: { id: { in: users } } });
      await db.prisma.outbox.deleteMany({
        where: {
          OR: [
            ...ids,
            ...parties,
            ...quests.map((q: any) => q.id),
            ...meetups.map((m: any) => m.id),
          ].map((id) => ({ envelope: { path: ["entityId"], equals: id } })),
        },
      });
      await app.close();
    }
  },
);
