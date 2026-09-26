import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { profileInput, timetableInput } from "../src/modules/profile";

const entry = () => ({
  id: randomUUID(),
  title: "수업",
  weekday: 1,
  startMinute: 540,
  endMinute: 600,
  locationName: null,
});
const timetable = () => ({
  expectedVersion: 1,
  timezone: "Asia/Seoul",
  semesterStartsOn: "2026-09-01",
  semesterEndsOn: "2026-12-21",
  entries: [entry()],
});
const invalid = (e: any) => e.getStatus?.() === 400;
test("profile rejects unbounded fields, malformed versions and caller-supplied ownership", () => {
  for (const b of [
    { expectedVersion: 1 },
    { expectedVersion: 0, displayName: "a" },
    { expectedVersion: 1, displayName: " " },
    { expectedVersion: 1, displayName: "a".repeat(101) },
    { expectedVersion: 1, department: 1 },
    { expectedVersion: 1, admissionYear: 2026.5 },
    { expectedVersion: 1, interests: [" x", "x"] },
    { expectedVersion: 1, interests: Array(21).fill("a") },
    { expectedVersion: 1, statusMessage: "a".repeat(301) },
    { expectedVersion: 1, userId: randomUUID(), displayName: "a" },
  ])
    assert.throws(() => profileInput(b), invalid);
});
test("timetable rejects date rollover, overlap, duplicate IDs and invalid boundaries", () => {
  const e = entry();
  for (const patch of [
    { semesterStartsOn: "2026-02-29" },
    { semesterStartsOn: "1900-02-29" },
    { semesterEndsOn: "2026-13-01" },
    { semesterEndsOn: "2026-04-31" },
    { semesterStartsOn: "0000-01-01" },
    { semesterStartsOn: "2026-12-22" },
    { semesterStartsOn: null },
    { semesterStartsOn: null, semesterEndsOn: null },
    { entries: [{ ...e, weekday: 0 }] },
    { entries: [{ ...e, startMinute: 540.5 }] },
    { entries: [{ ...e, endMinute: 1441 }] },
    { entries: [{ ...e, endMinute: 540 }] },
    { entries: [{ ...e, title: "a".repeat(101) }] },
    { entries: [{ ...e, owner: randomUUID() }] },
    { entries: [e, { ...e, id: e.id.toUpperCase(), weekday: 2 }] },
    { entries: [e, { ...entry(), startMinute: 599 }] },
    { entries: Array.from({ length: 101 }, entry) },
    { timezone: "UTC" },
    { owner: randomUUID() },
  ])
    assert.throws(() => timetableInput({ ...timetable(), ...patch }), invalid);
  assert.equal(
    timetableInput({
      ...timetable(),
      semesterStartsOn: "2000-02-29",
      entries: [e, { ...entry(), startMinute: 600, endMinute: 1440 }],
    }).timetable.entries.length,
    2,
  );
});

test(
  "authenticated private profile/timetable HTTP flow with real PostgreSQL",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async (t) => {
    // Build first: integration verifies the same emitted Nest dependency metadata as production.
    const { NestFactory } = require("@nestjs/core");
      const {
      AppModule,
      Errors,
      runtimeControllers,
      PublicController,
    } = require("../dist/modules/http");
    const { Database } = require("../dist/modules/database");
    const { AuthService } = require("../dist/modules/auth");
    process.env.JWT_SECRET = "profile-integration-test-only";
    process.env.GOOGLE_WEB_CLIENT_ID = "profile-test-audience";
    const app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new Errors());
    await app.listen(0, "127.0.0.1");
    const db = app.get(Database);
    const users = [randomUUID(), randomUUID()];
    const base = await app.getUrl();
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
    try {
      for (const id of users)
        await db.pool.query(
          "INSERT INTO users(id,google_sub,email,display_name) VALUES($1,$2,$3,$4)",
          [id, id, `${id}@snu.ac.kr`, "Google name"],
        );
      await t.test(
        "defaults and ownership are enforced through authenticated routes",
        async () => {
          for (const path of ["/me/profile", "/me/timetable"])
            assert.equal((await request(null, path)).status, 401);
          assert.deepEqual((await request(users[0], "/me/profile")).body, {
            displayName: "Google name",
            department: null,
            admissionYear: null,
            interests: [],
            statusMessage: null,
            version: 1,
          });
          assert.deepEqual((await request(users[0], "/me/timetable")).body, {
            timezone: "Asia/Seoul",
            semesterStartsOn: null,
            semesterEndsOn: null,
            entries: [],
            version: 1,
          });
          assert.equal(
            (
              await request(users[0], "/me/profile", "PATCH", {
                expectedVersion: 1,
                displayName: "Attack",
                userId: users[1],
              })
            ).status,
            400,
          );
          assert.equal(
            (await request(users[0], `/users/${users[1]}/timetable`)).status,
            404,
          );
          assert.ok(!runtimeControllers("admin").includes(PublicController));
        },
      );
      await t.test(
        "same-version profile saves have one winner and preserve optional fields",
        async () => {
          const results = await Promise.all(
            ["First", "Second"].map((displayName) =>
              request(users[0], "/me/profile", "PATCH", {
                expectedVersion: 1,
                displayName,
                department: "컴퓨터공학부",
                admissionYear: 2026,
                interests: ["음악"],
                statusMessage: "안녕",
              }),
            ),
          );
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            results.find((r) => r.status === 409)!.body.code,
            "VERSION_CONFLICT",
          );
          const saved = (await request(users[0], "/me/profile")).body;
          assert.equal(saved.version, 2);
          const cleared = await request(users[0], "/me/profile", "PATCH", {
            expectedVersion: 2,
            statusMessage: null,
          });
          assert.equal(cleared.body.department, "컴퓨터공학부");
          assert.equal(cleared.body.statusMessage, null);
          const auth = app.get(AuthService);
          auth.google = {
            verifyIdToken: async () => ({
              getPayload: () => ({
                sub: users[0],
                email: `${users[0]}@snu.ac.kr`,
                email_verified: true,
                hd: "snu.ac.kr",
                name: "New Google name",
              }),
            }),
          };
          const login = await auth.login({ idToken: "verified-fixture-only" });
          assert.equal(login.user.displayName, saved.displayName);
          assert.equal(
            (await request(users[1], "/me/profile")).body.version,
            1,
          );
        },
      );
      await t.test(
        "timetable replacement is atomic, versioned, private and independently versioned",
        async () => {
          const first = timetable(),
            second = timetable();
          const results = await Promise.all(
            [first, second].map((b) =>
              request(users[0], "/me/timetable", "PUT", b),
            ),
          );
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            results.find((r) => r.status === 409)!.body.code,
            "VERSION_CONFLICT",
          );
          const saved = results.find((r) => r.status === 200)!.body;
          assert.equal(saved.version, 2);
          assert.deepEqual(
            (await request(users[0], "/me/timetable")).body,
            saved,
          );
          assert.equal(
            (
              await request(users[0], "/me/timetable", "PUT", {
                ...first,
                expectedVersion: 2,
                entries: [entry(), entry()],
              })
            ).status,
            400,
          );
          assert.deepEqual(
            (await request(users[0], "/me/timetable")).body,
            saved,
          );
          assert.equal(
            (await request(users[1], "/me/timetable")).body.entries.length,
            0,
          );
          const empty = await request(users[0], "/me/timetable", "PUT", {
            expectedVersion: 2,
            semesterStartsOn: null,
            semesterEndsOn: null,
            entries: [],
          });
          assert.equal(empty.body.version, 3);
          assert.deepEqual(empty.body.entries, []);
          assert.equal(
            (await request(users[0], "/me/profile")).body.version,
            3,
          );
        },
      );
    } finally {
      await db.pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [
        users,
      ]);
      await app.close();
    }
  },
);
