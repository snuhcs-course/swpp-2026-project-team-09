import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { meetupInput, meetupResponseInput } from "../src/modules/meetups";

const proposal = () => ({
  friendId: randomUUID(),
  title: "점심 약속",
  startsAt: "2099-10-01T03:00:00Z",
  endsAt: "2099-10-01T04:00:00Z",
  locationName: "학생회관",
});
test("meetup validation rejects unknown ownership, invalid exact times and response versions", () => {
  for (const patch of [
    { senderId: randomUUID() },
    { friendId: "invalid" },
    { title: " " },
    { title: "a".repeat(201) },
    { locationName: "a".repeat(301) },
    { startsAt: "2099-02-29T03:00:00Z" },
    { startsAt: "2099-04-31T03:00:00Z" },
    { startsAt: "2099-10-01T24:00:00Z" },
    { startsAt: "2099-10-01T03:00:00" },
    { startsAt: "2020-10-01T03:00:00Z" },
    { endsAt: "2099-10-01T03:00:00Z" },
    { endsAt: "2099-11-02T04:00:00Z" },
  ]) {
    assert.throws(
      () => meetupInput({ ...proposal(), ...patch }),
      (e: any) => e.getStatus?.() === 400,
    );
  }
  assert.equal(
    meetupInput({
      ...proposal(),
      startsAt: "2099-10-01T12:00:00+09:00",
    }).starts_at.toISOString(),
    "2099-10-01T03:00:00.000Z",
  );
  for (const body of [
    { action: "accept" },
    { action: "accept", expectedVersion: 0 },
    { action: "cancel", expectedVersion: 1.5 },
    { action: "edit", expectedVersion: 1 },
    { action: "accept", expectedVersion: 1, partyId: randomUUID() },
  ]) {
    assert.throws(
      () => meetupResponseInput(body),
      (e: any) => e.getStatus?.() === 400,
    );
  }
});

test(
  "private concrete meetup proposal lifecycle and schedule concurrency over HTTP",
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
    process.env.JWT_SECRET = "meetup-integration-fixture-only";
    const app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new Errors());
    await app.listen(0, "127.0.0.1");
    const db = app.get(Database),
      social = app.get(SocialService);
    const users = Array.from({ length: 4 }, () => randomUUID());
    const base = await app.getUrl();
    const partyIds: string[] = [];
    const starts = Date.now() + 7 * 86400000;
    function plan(hour: number) {
      return {
        friendId: users[1],
        title: "Concrete plan",
        startsAt: new Date(starts + hour * 3600000).toISOString(),
        endsAt: new Date(starts + (hour + 1) * 3600000).toISOString(),
        locationName: "Test cafe",
      };
    }
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
      const response = await fetch(`${base}/v1${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: (await response.json()) as any };
    }
    async function create(hour: number) {
      const r = await request(users[0], "/meetups", "POST", plan(hour));
      assert.equal(r.status, 201, JSON.stringify(r.body));
      return r.body;
    }
    async function respond(
      user: string,
      id: string,
      action: string,
      expectedVersion = 1,
    ) {
      return request(user, `/meetups/${id}/respond`, "POST", {
        action,
        expectedVersion,
      });
    }
    try {
      await db.prisma.user.createMany({
        data: users.map((id) => ({
          id,
          google_sub: id,
          email: `${id}@snu.ac.kr`,
          display_name: "Meetup fixture",
        })),
      });
      const friendship = await social.requestFriend(users[0], {
        email: `${users[1]}@snu.ac.kr`,
      });
      await t.test(
        "authentication, accepted friendship and action roles are required",
        async () => {
          assert.equal((await request(null, "/meetups")).status, 401);
          assert.equal(
            (await request(users[0], "/meetups", "POST", plan(0))).status,
            403,
          );
          assert.equal(
            (
              await request(users[0], "/meetups", "POST", {
                ...plan(0),
                friendId: users[2],
              })
            ).status,
            403,
          );
          await social.friendAction(users[1], friendship.id);
          const pending = await create(0);
          assert.equal(pending.sender.id, users[0]);
          assert.equal(pending.recipient.id, users[1]);
          assert.equal(pending.status, "pending");
          assert.equal(pending.version, 1);
          assert.equal(pending.partyId, null);
          assert.equal(pending.questId, null);
          assert.equal(
            (await respond(users[0], pending.id, "accept")).status,
            403,
          );
          assert.equal(
            (await respond(users[1], pending.id, "cancel")).status,
            403,
          );
          assert.equal(
            (await respond(users[2], pending.id, "accept")).status,
            404,
          );
          assert.equal(
            (await respond(users[1], pending.id, "accept", 2)).status,
            409,
          );
          const declined = await respond(users[1], pending.id, "decline");
          assert.equal(declined.body.status, "declined");
          assert.deepEqual(
            (await respond(users[1], pending.id, "decline")).body,
            declined.body,
          );
          assert.equal(
            (await respond(users[1], pending.id, "accept")).status,
            409,
          );
          assert.equal(
            (await respond(users[0], pending.id, "cancel", 2)).status,
            409,
          );
          assert.ok(!runtimeControllers("admin").includes(PublicController));
        },
      );
      await t.test(
        "simultaneous and repeated acceptance produces one private party and active quest",
        async () => {
          const pending = await create(2);
          const results = await Promise.all([
            respond(users[1], pending.id, "accept"),
            respond(users[1], pending.id, "accept"),
          ]);
          assert.deepEqual(
            results.map((r) => r.status),
            [201, 201],
          );
          assert.deepEqual(results[0].body, results[1].body);
          const accepted = results[0].body;
          partyIds.push(accepted.partyId);
          assert.equal(accepted.status, "accepted");
          assert.equal(accepted.version, 2);
          assert.equal(
            await db.prisma.quest.count({
              where: { party_id: accepted.partyId },
            }),
            1,
          );
          assert.equal(
            await db.prisma.partyMember.count({
              where: { party_id: accepted.partyId },
            }),
            2,
          );
          const own = (await request(users[0], "/parties")).body.items.find(
            (p: any) => p.id === accepted.partyId,
          );
          assert.equal(own.visibility, "private");
          assert.equal(own.maxMembers, 2);
          assert.equal(
            (await request(users[2], "/parties")).body.items.some(
              (p: any) => p.id === accepted.partyId,
            ),
            false,
          );
          assert.deepEqual(
            (await request(users[2], "/meetups")).body.items,
            [],
          );
          assert.equal(
            (await request(users[2], "/quests")).body.items.some(
              (q: any) => q.id === accepted.questId,
            ),
            false,
          );
          await assert.rejects(
            () =>
              db.tx((c: any) => social.party(c, accepted.partyId, users[2])),
            (e: any) => e.getStatus() === 404,
          );
          assert.equal(
            (
              await request(
                users[2],
                `/parties/${accepted.partyId}/join`,
                "POST",
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await request(
                users[2],
                `/parties/${accepted.partyId}/membership`,
                "DELETE",
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await request(
                users[2],
                `/parties/${accepted.partyId}/sharing`,
                "PATCH",
                { enabled: true },
              )
            ).status,
            404,
          );
          assert.equal(
            (await respond(users[0], pending.id, "cancel", 2)).status,
            409,
          );
          const quest = (await request(users[1], "/quests")).body.items.find(
            (q: any) => q.id === accepted.questId,
          );
          assert.equal(quest.title, pending.title);
          assert.equal(quest.startsAt, pending.startsAt);
          assert.equal(quest.status, "active");
          const hints = await db.prisma.outbox.findMany({
            where: { envelope: { path: ["entityId"], equals: pending.id } },
          });
          assert.equal(hints.length, 2);
          for (const hint of hints)
            assert.deepEqual(hint.envelope.audience, {
              kind: "users",
              userIds: [users[0], users[1]],
            });
        },
      );
      await t.test(
        "cancel versus accept serializes with exactly one terminal outcome",
        async () => {
          const pending = await create(4);
          const responses = await Promise.all([
            respond(users[0], pending.id, "cancel"),
            respond(users[1], pending.id, "accept"),
          ]);
          assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
          const saved = (await request(users[0], "/meetups")).body.items.find(
            (m: any) => m.id === pending.id,
          );
          assert.equal(saved.version, 2);
          if (saved.status === "accepted") partyIds.push(saved.partyId);
          else {
            assert.equal(saved.status, "cancelled");
            assert.equal(saved.partyId, null);
            assert.equal(saved.questId, null);
          }
        },
      );
      await t.test(
        "different overlapping proposals serialize on participants and reject without leaking schedule details",
        async () => {
          const a = await create(6),
            b = await create(6);
          const responses = await Promise.all([
            respond(users[1], a.id, "accept"),
            respond(users[1], b.id, "accept"),
          ]);
          assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
          partyIds.push(responses.find((r) => r.status === 201)!.body.partyId);
          const rejected = responses.find((r) => r.status === 409)!;
          assert.equal(rejected.body.code, "SCHEDULE_CONFLICT");
          assert.equal(
            JSON.stringify(rejected.body).includes("Concrete plan"),
            false,
          );
        },
      );
      await t.test(
        "acceptance rechecks current friendship and latest timetable without disclosing private classes",
        async () => {
          const pending = await create(20);
          await db.prisma.friendship.update({
            where: { id: friendship.id },
            data: { status: "pending" },
          });
          assert.equal(
            (await respond(users[1], pending.id, "accept")).status,
            403,
          );
          await social.friendAction(users[1], friendship.id);
          const updated = await request(users[1], "/me/timetable", "PUT", {
            expectedVersion: 1,
            timezone: "Asia/Seoul",
            semesterStartsOn: new Date(starts - 86400000)
              .toISOString()
              .slice(0, 10),
            semesterEndsOn: new Date(starts + 5 * 86400000)
              .toISOString()
              .slice(0, 10),
            entries: Array.from({ length: 7 }, (_, i) => ({
              id: randomUUID(),
              title: "Secret course name",
              weekday: i + 1,
              startMinute: 0,
              endMinute: 1440,
              locationName: "Private room",
            })),
          });
          assert.equal(updated.status, 200);
          const rejected = await respond(users[1], pending.id, "accept");
          assert.equal(rejected.status, 409);
          assert.equal(rejected.body.code, "SCHEDULE_CONFLICT");
          assert.equal(JSON.stringify(rejected.body).includes("Secret"), false);
          assert.equal(
            (
              await db.prisma.meetup.findUniqueOrThrow({
                where: { id: pending.id },
              })
            ).status,
            "pending",
          );
          // A title-only edit and cancellation must remain possible despite newly entered conflicts.
          const old = await db.prisma.quest.findFirstOrThrow({
            where: { party_id: { in: partyIds }, status: "active" },
          });
          const title = await request(users[0], `/quests/${old.id}`, "PATCH", {
            expectedVersion: old.version,
            title: "Metadata update",
          });
          assert.equal(title.status, 200);
          const cancelled = await request(
            users[0],
            `/quests/${old.id}`,
            "PATCH",
            { expectedVersion: title.body.version, status: "cancelled" },
          );
          assert.equal(cancelled.status, 200);
          const party = await social.createParty(users[1], {
            title: "Scheduling test",
            maxMembers: 2,
          });
          partyIds.push(party.id);
          const questBody = {
            partyId: party.id,
            title: "Blocked plan",
            startsAt: pending.startsAt,
            endsAt: pending.endsAt,
            locationName: "Test",
          };
          assert.equal(
            (await request(users[1], "/quests", "POST", questBody)).body.code,
            "SCHEDULE_CONFLICT",
          );
          assert.equal(
            (
              await request(users[1], "/quests", "POST", {
                ...questBody,
                endsAt: new Date(
                  Date.parse(pending.startsAt) + 32 * 86400000,
                ).toISOString(),
              })
            ).status,
            400,
          );
          const cleared = await request(users[1], "/me/timetable", "PUT", {
            expectedVersion: 2,
            semesterStartsOn: null,
            semesterEndsOn: null,
            entries: [],
          });
          assert.equal(cleared.status, 200);
        },
      );
      await t.test(
        "expiration persists on list and response and cannot be accepted",
        async () => {
          const a = await create(8),
            b = await create(9);
          const past = {
            starts_at: new Date(Date.now() - 120000),
            ends_at: new Date(Date.now() - 60000),
          };
          await db.prisma.meetup.updateMany({
            where: { id: { in: [a.id, b.id] } },
            data: past,
          });
          const response = await respond(users[1], a.id, "accept");
          assert.equal(response.status, 409);
          assert.equal(response.body.code, "MEETUP_EXPIRED");
          const listed = (await request(users[0], "/meetups")).body.items;
          for (const id of [a.id, b.id]) {
            const row = listed.find((m: any) => m.id === id);
            assert.equal(row.status, "expired");
            assert.equal(row.version, 2);
            assert.equal(row.partyId, null);
          }
          await request(users[1], "/meetups");
          assert.equal(
            await db.prisma.outbox.count({
              where: { envelope: { path: ["entityId"], equals: b.id } },
            }),
            2,
          );
        },
      );
      await t.test(
        "quest time changes share acceptance locks while harmless edits and cancellation remain possible",
        async () => {
          const first = await create(12),
            second = await create(14);
          const accepted = (await respond(users[1], first.id, "accept")).body;
          partyIds.push(accepted.partyId);
          // Existing quest moves into the new proposal's interval concurrently with acceptance.
          const results = await Promise.all([
            request(users[0], `/quests/${accepted.questId}`, "PATCH", {
              expectedVersion: 1,
              startsAt: second.startsAt,
              endsAt: second.endsAt,
            }),
            respond(users[1], second.id, "accept"),
          ]);
          assert.equal(results.filter((r) => r.status < 300).length, 1);
          assert.equal(
            results.find((r) => r.status === 409)!.body.code,
            "SCHEDULE_CONFLICT",
          );
          if (results[1].status === 201) partyIds.push(results[1].body.partyId);
          const quest = await db.prisma.quest.findUniqueOrThrow({
            where: { id: accepted.questId },
          });
          const title = await request(
            users[0],
            `/quests/${accepted.questId}`,
            "PATCH",
            { expectedVersion: quest.version, title: "Renamed" },
          );
          assert.equal(title.status, 200);
          const cancelled = await request(
            users[0],
            `/quests/${accepted.questId}`,
            "PATCH",
            { expectedVersion: title.body.version, status: "cancelled" },
          );
          assert.equal(cancelled.status, 200);
        },
      );
    } finally {
      const rows = await db.prisma.meetup.findMany({
        where: { sender_id: users[0] },
      });
      const allParties = [
        ...new Set([
          ...partyIds,
          ...rows.map((r: any) => r.party_id).filter(Boolean),
        ]),
      ];
      await db.prisma.meetup.deleteMany({ where: { sender_id: users[0] } });
      const quests = await db.prisma.quest.findMany({
        where: { party_id: { in: allParties } },
      });
      await db.prisma.quest.deleteMany({
        where: { party_id: { in: allParties } },
      });
      await db.prisma.party.deleteMany({ where: { id: { in: allParties } } });
      await db.prisma.friendship.deleteMany({
        where: {
          OR: [{ sender_id: { in: users } }, { receiver_id: { in: users } }],
        },
      });
      await db.prisma.user.deleteMany({ where: { id: { in: users } } });
      await db.prisma.outbox.deleteMany({
        where: {
          OR: [
            ...rows.map((r: any) => r.id),
            ...quests.map((q: any) => q.id),
            ...allParties,
          ].map((id) => ({ envelope: { path: ["entityId"], equals: id } })),
        },
      });
      await app.close();
    }
  },
);
