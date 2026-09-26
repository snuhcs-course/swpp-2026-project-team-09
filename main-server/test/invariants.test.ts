import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  AuthService,
  schoolIdentity,
  InternalGuard,
} from "../src/modules/auth";
import {
  AdminController,
  InternalController,
  runtimeControllers,
} from "../src/modules/http";
import { mayShare } from "../src/modules/location";
import { deliverOutbox } from "../src/modules/database";
import { ensureCapacity } from "../src/modules/social";
import { eventInput, time } from "../src/modules/validation";

test("school identity requires verified email, exact school domain and hosted domain", () => {
  const valid: any = {
    sub: "google-id",
    email: "student@snu.ac.kr",
    email_verified: true,
    hd: "snu.ac.kr",
  };
  assert.equal(schoolIdentity(valid).sub, "google-id");
  for (const patch of [
    { email_verified: false },
    { email: "student@fake.snu.ac.kr" },
    { hd: "other.ac.kr" },
    { email: "student@snu.ac.kr.attacker.test" },
    { sub: "" },
  ])
    assert.throws(() => schoolIdentity({ ...valid, ...patch }));
});
test("OAuth verification runs with configured audience; invalid Google tokens never hit DB", async () => {
  process.env.GOOGLE_WEB_CLIENT_ID = "test-google-audience";
  process.env.JWT_SECRET = "unit-test-secret";
  let called = false;
  const db: any = {
    requireReady() {
      throw Error("Database must not run");
    },
  };
  const auth = new AuthService(db);
  (auth as any).google = {
    verifyIdToken: async (input: any) => {
      called = true;
      assert.equal(input.audience, "test-google-audience");
      throw Error("bad signature");
    },
  };
  await assert.rejects(
    () => auth.login({ idToken: "invalid-token" }),
    /Invalid Google/,
  );
  assert.ok(called);
});
test("public runtime never mounts administrative controllers", () => {
  assert.ok(!runtimeControllers("public").includes(AdminController));
  assert.ok(runtimeControllers("admin").includes(AdminController));
  assert.ok(!runtimeControllers("admin").includes(InternalController));
  assert.throws(() => runtimeControllers("invalid"));
});
test("internal key cannot be omitted or replaced by bearer auth", () => {
  const guard = new InternalGuard();
  delete process.env.INTERNAL_API_KEY;
  const context: any = {
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  };
  assert.throws(() => guard.canActivate(context));
  process.env.INTERNAL_API_KEY = "correct";
  assert.throws(() => guard.canActivate(context));
});
test("location matrix preserves friend sharing and fails closed on unresolved overlaps", () => {
  assert.equal(mayShare(true, true, null, [true]), true);
  assert.equal(mayShare(false, true, null, [true]), false);
  assert.equal(
    mayShare(true, false, { accepted: true, bothOn: true }, []),
    false,
  );
  assert.equal(
    mayShare(true, true, { accepted: true, bothOn: true }, [false]),
    true,
  );
  assert.equal(
    mayShare(true, true, { accepted: true, bothOn: false }, [true]),
    false,
  );
  assert.equal(mayShare(true, true, null, [true, false]), false);
  assert.equal(mayShare(true, true, null, []), false);
});
test("outbox invalidates versioned cache before broadcasting and does not publish after invalidation failure", async () => {
  const calls: string[] = [];
  const redis: any = {
    eval: async () => {
      calls.push("invalidate");
    },
    publish: async () => {
      calls.push("publish");
    },
  };
  await deliverOutbox(redis, {
    event_revision: 3,
    envelope: { id: randomUUID() },
  });
  assert.deepEqual(calls, ["invalidate", "publish"]);
  calls.length = 0;
  redis.eval = async () => {
    throw Error("redis down");
  };
  await assert.rejects(() =>
    deliverOutbox(redis, { event_revision: 4, envelope: {} }),
  );
  assert.deepEqual(calls, []);
});
test("capacity and event validation reject unsafe inputs", () => {
  assert.throws(() => ensureCapacity(2, 1, 2));
  ensureCapacity(1, 1, 2);
  assert.throws(() =>
    eventInput({
      title: "x",
      startsAt: "2026-09-27T00:00:00Z",
      endsAt: "2026-09-26T00:00:00Z",
      locationName: "x",
    }),
  );
});

test("ISO timestamps normalize offsets and fractional seconds before ordering", () => {
  assert.equal(
    time("2026-09-27T09:00:00+09:00", "observedAt"),
    "2026-09-27T00:00:00.000Z",
  );
  assert.equal(
    time("2026-09-27T00:00:00.1Z", "observedAt"),
    "2026-09-27T00:00:00.100Z",
  );
});
