// Run after building the four server apps. Fixtures live only in temporary databases.
// PROTOTYPE_APP_ROOT=/path/to/built/checkout node tests/prototype-e2e.mjs
// Reads ignored .env.prototype.local; optional PROTOTYPE_ENV_FILE overrides its path.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(
  process.env.PROTOTYPE_APP_ROOT ||
    resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
const requireMain = createRequire(resolve(root, "main-server/package.json"));
const { Pool } = requireMain("pg");
const jwt = requireMain("jsonwebtoken");
const Redis = requireMain("ioredis");
const requireClient = createRequire(
  resolve(
    process.env.PROTOTYPE_SOCKET_CLIENT_ROOT || root,
    "mobile/package.json",
  ),
);
const { io } = requireClient("socket.io-client");
const config = {};
for (const line of (
  await readFile(
    process.env.PROTOTYPE_ENV_FILE || resolve(root, ".env.prototype.local"),
    "utf8",
  )
).split("\n")) {
  if (!line.trim() || line.startsWith("#") || !line.includes("=")) continue;
  const index = line.indexOf("=");
  config[line.slice(0, index)] = line
    .slice(index + 1)
    .replace(/^(['"])(.*)\1$/, "$2");
}
assert.ok(
  config.POSTGRES_PASSWORD,
  "POSTGRES_PASSWORD required in the local integration environment",
);
const run = randomBytes(8).toString("hex");
const secret = randomBytes(32).toString("hex");
const internalKey = randomBytes(32).toString("hex");
const dbNames = [`e2e_main_${run}`, `e2e_match_${run}`];
const pgBase = `postgresql://${encodeURIComponent(process.env.PROTOTYPE_PG_USER || "postgres")}:${encodeURIComponent(config.POSTGRES_PASSWORD)}@${process.env.PROTOTYPE_PG_HOST || "127.0.0.1"}:${process.env.PROTOTYPE_PG_PORT || "54329"}`;
const adminDb = new Pool({ connectionString: `${pgBase}/postgres` });
const mainDb = new Pool({ connectionString: `${pgBase}/${dbNames[0]}` });
const matchDb = new Pool({ connectionString: `${pgBase}/${dbNames[1]}` });
const cacheUrl =
  process.env.PROTOTYPE_TEST_CACHE_URL || "redis://127.0.0.1:63791/14";
const queueUrl =
  process.env.PROTOTYPE_TEST_QUEUE_URL || "redis://127.0.0.1:63792/15";
for (const url of [cacheUrl, queueUrl])
  assert.match(
    new URL(url).pathname,
    /^\/(?:[1-9]|1[0-5])$/,
    "Use a nondefault test Redis DB index",
  );
assert.notEqual(cacheUrl, queueUrl, "Cache and queue indexes must be distinct");
const cache = new Redis(cacheUrl, { maxRetriesPerRequest: 1 });
const queue = new Redis(queueUrl, { maxRetriesPerRequest: 1 });
cache.on("error", () => {});
queue.on("error", () => {});
const ownedRedis = [],
  createdDb = [],
  children = [],
  sockets = [];
const marker = "__prototype_e2e_owner";
const ports = {
  public: 13900,
  admin: 13901,
  socket: 13902,
  worker: 13903,
  match: 13904,
};
const bases = Object.fromEntries(
  Object.entries(ports).map(([name, port]) => [
    name,
    `http://127.0.0.1:${port}`,
  ]),
);
const log = (message) => console.log(`PASS ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, label, timeout = 35000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(150);
  }
  throw new Error(`Timed out: ${label}`);
}
async function http(
  service,
  path,
  { token, body, method = "GET", status = 200, internal = false, timeoutMs = 18000 } = {},
) {
  const response = await fetch(bases[service] + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(internal ? { "x-internal-key": internalKey } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await response.json();
  assert.equal(
    response.status,
    status,
    `${service} ${method} ${path}: ${JSON.stringify(json)}`,
  );
  return json;
}
async function portFree(port) {
  const server = createServer();
  await new Promise((resolve, reject) =>
    server.once("error", reject).listen(port, "127.0.0.1", resolve),
  );
  await new Promise((resolve) => server.close(resolve));
}
function start(name, app, extra) {
  const child = spawn(process.execPath, ["dist/main.js"], {
    cwd: resolve(root, app),
    env: {
      ...process.env,
      PORT: String(ports[name]),
      JWT_SECRET: secret,
      INTERNAL_API_KEY: internalKey,
      ADMIN_EMAILS: `admin-${run}@snu.ac.kr`,
      GOOGLE_WEB_CLIENT_ID: "",
      OPENAI_API_KEY: "",
      REDIS_CACHE_URL: cacheUrl,
      REDIS_QUEUE_URL: queueUrl,
      CORS_ORIGINS: "http://localhost:3100",
      MAIN_INTERNAL_URL: bases.public,
      WORKER_URL: bases.worker,
      ...extra,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (data) => {
      output = (output + data.toString()).slice(-12000);
    });
  children.push({ child, name, output: () => output });
}
async function healthy(name) {
  await until(async () => {
    const process = children.find((c) => c.name === name);
    if (process.child.exitCode !== null)
      throw new Error(`${name} exited: ${process.output()}`);
    try {
      const response = await fetch(bases[name] + "/health");
      return response.ok;
    } catch {
      return false;
    }
  }, `${name} readiness`);
}
async function socketConnect(token, expectedFailure = false) {
  const socket = io(bases.socket, {
    autoConnect: false,
    transports: ["websocket"],
    reconnection: false,
    timeout: 5000,
    auth: token ? { token } : {},
  });
  sockets.push(socket);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Socket connection timeout")),
      7000,
    );
    socket.once("connect", () => {
      clearTimeout(timeout);
      expectedFailure
        ? reject(new Error("Unauthenticated socket accepted"))
        : resolve();
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      expectedFailure ? resolve() : reject(error);
    });
    socket.connect();
  });
  return socket;
}
try {
  for (const port of Object.values(ports)) await portFree(port);
  for (const redis of [cache, queue]) {
    assert.equal(
      await redis.dbsize(),
      0,
      "Test Redis index is not empty; refusing ownership or cleanup",
    );
    assert.equal(await redis.set(marker, run, "NX"), "OK");
    ownedRedis.push(redis);
  }
  for (const name of dbNames) {
    await adminDb.query(`CREATE DATABASE "${name}"`);
    createdDb.push(name);
  }
  await mainDb.query("CREATE EXTENSION postgis");
  start("public", "main-server", {
    APP_ROLE: "public",
    DATABASE_URL: `${pgBase}/${dbNames[0]}`,
  });
  await healthy("public");
  start("admin", "main-server", {
    APP_ROLE: "admin",
    DATABASE_URL: `${pgBase}/${dbNames[0]}`,
  });
  start("socket", "socket-server", {});
  start("worker", "worker-server", {});
  start("match", "match-server", { DATABASE_URL: `${pgBase}/${dbNames[1]}` });
  for (const service of ["admin", "socket", "worker", "match"])
    await healthy(service);
  log("all five configured runtimes healthy");

  const users = Array.from({ length: 4 }, (_, i) => ({
    id: randomUUID(),
    email: i === 0 ? `admin-${run}@snu.ac.kr` : `student-${i}-${run}@snu.ac.kr`,
  }));
  for (const user of users) {
    await mainDb.query(
      "INSERT INTO users(id,google_sub,email,display_name) VALUES($1,$2,$3,$4)",
      [user.id, `test-only-${user.id}`, user.email, "Integration fixture"],
    );
    user.token = jwt.sign(
      { email: user.email, role: user === users[0] ? "admin" : "student" },
      secret,
      { algorithm: "HS256", subject: user.id, expiresIn: "10m" },
    );
  }
  const [admin, a, b, outsider] = users;
  await http("public", "/v1/events", { status: 401 });
  await http("public", "/v1/admin/events", { token: admin.token, status: 404 });
  await http("admin", "/v1/admin/events", { token: a.token, status: 403 });
  await http("worker", "/v1/campus/meals", { status: 401 });
  await http("public", "/v1/auth/google", {
    method: "POST",
    body: { idToken: "invalid" },
    status: 503,
  });
  await socketConnect(undefined, true);
  const socket = await socketConnect(a.token),
    hints = [];
  socket.on("domain.changed", (hint) => hints.push(hint));
  log("HTTP runtime/role/key boundaries and socket authentication");

  await http("public", "/v1/me/image-extractions", { method: "POST", body: {}, status: 401 });
  await http("worker", "/v1/internal/image-extractions", { method: "POST", body: {}, status: 401 });
  await http("admin", "/v1/me/image-extractions", { method: "POST", body: {}, token: a.token, status: 404 });
  if (process.env.PROTOTYPE_IMAGE_EVAL_FILE) {
    assert.ok(process.env.OLLAMA_BASE_URL, "Explicit local model URL required for real-image E2E");
    const path=process.env.PROTOTYPE_IMAGE_EVAL_FILE;
    const image=await readFile(path);
    const before=await http("public", "/v1/me/timetable", {token:a.token});
    const counts=async()=> (await mainDb.query("SELECT (SELECT count(*)::int FROM quests) AS quests,(SELECT count(*)::int FROM private_events) AS private_events")).rows[0];
    const previous=await counts();
    const draft=await http("public", "/v1/me/image-extractions", {
      token:a.token, method:"POST", status:201, timeoutMs:195000,
      body:{kind:"event",mimeType:path.endsWith(".png")?"image/png":"image/jpeg",imageBase64:image.toString("base64")},
    });
    assert.equal(draft.kind,"event");
    assert.equal(draft.model,"qwen3-vl:2b-instruct-q4_K_M");
    assert.equal(typeof draft.draft.title,"string");
    assert.ok(Array.isArray(draft.warnings));
    assert.deepEqual(await http("public", "/v1/me/timetable", {token:a.token}),before);
    assert.deepEqual(await counts(),previous);
    log("real local image extraction through authenticated main/worker; no timetable/quest/private-event writes");
  }



  await http("public", "/v1/me/profile", { status: 401 });
  await http("public", "/v1/me/timetable", { status: 401 });
  await http("admin", "/v1/me/profile", { token: a.token, status: 404 });
  const initialProfile = await http("public", "/v1/me/profile", { token: a.token });
  const profile = await http("public", "/v1/me/profile", {
    token: a.token, method: "PATCH",
    body: {
      expectedVersion: initialProfile.version,
      displayName: "Edited student", department: "Computer Science",
      admissionYear: 2025, interests: ["AI", "campus"], statusMessage: "Between classes",
    },
  });
  assert.equal(profile.version, initialProfile.version + 1);
  assert.equal((await http("public", "/v1/auth/me", { token: a.token })).displayName, "Edited student");
  assert.equal((await http("public", "/v1/me/profile", { token: b.token })).department, null);
  const profileConflict = await http("public", "/v1/me/profile", {
    token: a.token, method: "PATCH", status: 409,
    body: { expectedVersion: initialProfile.version, displayName: "Stale name" },
  });
  assert.equal(profileConflict.code, "VERSION_CONFLICT");
  const initialTimetable = await http("public", "/v1/me/timetable", { token: a.token });
  const timetableBody = {
    expectedVersion: initialTimetable.version,
    semesterStartsOn: "2026-09-01", semesterEndsOn: "2026-12-31",
    entries: [{ id: randomUUID(), title: "Software development", weekday: 1, startMinute: 600, endMinute: 660, locationName: "301" }],
  };
  const timetable = await http("public", "/v1/me/timetable", { token: a.token, method: "PUT", body: timetableBody });
  assert.equal(timetable.version, initialTimetable.version + 1);
  assert.equal(timetable.timezone, "Asia/Seoul");
  assert.equal((await http("public", "/v1/me/timetable", { token: b.token })).entries.length, 0);
  const timetableConflict = await http("public", "/v1/me/timetable", {
    token: a.token, method: "PUT", body: timetableBody, status: 409,
  });
  assert.equal(timetableConflict.code, "VERSION_CONFLICT");
  await http("public", "/v1/me/timetable", {
    token: a.token, method: "PUT", status: 400,
    body: { ...timetableBody, expectedVersion: timetable.version, semesterStartsOn: "2026-02-30" },
  });
  await http("public", "/v1/me/timetable", {
    token: a.token, method: "PUT", status: 400,
    body: { ...timetableBody, expectedVersion: timetable.version,
      entries: [...timetableBody.entries, { ...timetableBody.entries[0], id: randomUUID(), startMinute: 630 }] },
  });
  assert.deepEqual((await http("public", "/v1/me/timetable", { token: a.token })).entries, timetable.entries);
  log("owner-only profiles/timetables, edited identity, stale saves and atomic validation");

  const startsAt = new Date(Date.now() + 3600000).toISOString(),
    endsAt = new Date(Date.now() + 7200000).toISOString();
  const event = await http("admin", "/v1/admin/events", {
    token: admin.token,
    method: "POST",
    status: 201,
    body: {
      title: `Integration event ${run}`,
      description: "Temporary test database only",
      startsAt,
      endsAt,
      locationName: "Test",
      status: "published",
    },
  });
  await until(
    async () =>
      hints.some((h) => h.type === "event.changed" && h.entityId === event.id),
    "initial event socket hint",
  );
  const firstSnapshot = await http("public", "/v1/events", { token: a.token });
  assert.ok(firstSnapshot.items.some((item) => item.id === event.id));
  assert.ok(
    await cache.get("prototype:events"),
    "Public events cache is populated",
  );
  const edited = await http("admin", `/v1/admin/events/${event.id}`, {
    token: admin.token,
    method: "PATCH",
    body: { title: `Updated event ${run}` },
  });
  await until(
    async () =>
      hints.some(
        (h) => h.entityId === event.id && h.version === edited.version,
      ),
    "updated event socket hint",
  );
  const fresh = await http("public", "/v1/events", { token: a.token });
  assert.equal(
    fresh.items.find((item) => item.id === event.id).title,
    edited.title,
  );
  assert.ok(fresh.revision > firstSnapshot.revision);
  assert.ok(
    hints.every(
      (h) => !("audience" in h) && !("latitude" in h) && !("longitude" in h),
    ),
  );
  log(
    "admin event mutation → outbox/cache invalidation → socket hint → fresh snapshot",
  );

  const party = await http("public", "/v1/parties", {
    token: a.token,
    method: "POST",
    status: 201,
    body: { title: "Privacy test", maxMembers: 2 },
  });
  await http("public", `/v1/parties/${party.id}/join`, {
    token: b.token,
    method: "POST",
    status: 201,
  });
  assert.deepEqual(
    (await http("public", "/v1/parties", { token: outsider.token })).items.find(
      (p) => p.id === party.id,
    ).members,
    [],
  );
  const visibleParty = (await http("public", "/v1/parties", { token: outsider.token })).items.find(p => p.id === party.id);
  assert.equal(visibleParty.memberCount, 2);
  assert.equal(visibleParty.isMember, false);
  assert.equal(Object.hasOwn(visibleParty, "sharingEnabled"), false);
  const quest = await http("public", "/v1/quests", {
    token: a.token, method: "POST", status: 201,
    body: { partyId: party.id, title: "Shared integration plan", startsAt, endsAt, locationName: "Test" },
  });
  const updatedQuest = await http("public", `/v1/quests/${quest.id}`, {
    token: b.token, method: "PATCH", body: { expectedVersion: quest.version, title: "Member updated plan" },
  });
  const conflict = await http("public", `/v1/quests/${quest.id}`, {
    token: a.token, method: "PATCH", status: 409,
    body: { expectedVersion: quest.version, title: "Stale member update" },
  });
  assert.equal(conflict.code, "VERSION_CONFLICT");
  await http("public", `/v1/quests/${quest.id}`, {
    token: outsider.token, method: "PATCH", status: 403,
    body: { expectedVersion: updatedQuest.version, title: "Forbidden" },
  });
  const cancelledQuest = await http("public", `/v1/quests/${quest.id}`, {
    token: a.token, method: "PATCH",
    body: { expectedVersion: updatedQuest.version, status: "cancelled" },
  });
  await until(async () => hints.some(h => h.type === "quest.changed" && h.entityId === quest.id && h.version === cancelledQuest.version), "cancelled quest socket hint");
  const sharedSnapshot = await http("public", "/v1/quests", { token: b.token });
  assert.equal(sharedSnapshot.items.find(q => q.id === quest.id).status, "cancelled");
  assert.equal((await http("public", "/v1/quests", { token: outsider.token })).items.length, 0);
  log("party counts and shared quest edit/conflict/cancel → socket hint → authorized snapshot");

  for (const user of [a, b, outsider])
    await http("public", "/v1/me/location-sharing", {
      token: user.token,
      method: "PATCH",
      body: { enabled: true },
    });
  await http("public", "/v1/me/location", {
    token: a.token,
    method: "PUT",
    body: {
      latitude: 37.46,
      longitude: 126.95,
      accuracyM: 5,
      observedAt: new Date().toISOString(),
    },
  });
  const locations = (user) =>
    http("public", "/v1/locations", { token: user.token });
  assert.equal((await locations(b)).items.length, 1);
  assert.equal((await locations(outsider)).items.length, 0);
  await http("public", `/v1/parties/${party.id}/sharing`, {
    token: b.token,
    method: "PATCH",
    body: { enabled: false },
  });
  assert.equal((await locations(b)).items.length, 0);
  assert.equal(
    (await http("public", "/v1/parties", { token: b.token })).items.find(
      (p) => p.id === party.id,
    ).sharingEnabled,
    false,
  );
  const friend = await http("public", "/v1/friends", {
    token: a.token,
    method: "POST",
    status: 201,
    body: { email: b.email },
  });
  await http("public", `/v1/friends/${friend.id}/accept`, {
    token: b.token,
    method: "POST",
    status: 201,
  });
  for (const user of [a, b])
    await http("public", `/v1/friends/${friend.id}/sharing`, {
      token: user.token,
      method: "PATCH",
      body: { enabled: true },
    });
  assert.equal(
    (await locations(b)).items.length,
    1,
    "Mutual friend ON survives party OFF",
  );
  await http("public", "/v1/me/location-sharing", {
    token: a.token,
    method: "PATCH",
    body: { enabled: false },
  });
  assert.equal((await locations(b)).items.length, 0);
  log("member privacy, party OFF, mutual friend sharing, global OFF via HTTP");

  const recipientSocket = await socketConnect(b.token), recipientHints = [];
  const outsiderSocket = await socketConnect(outsider.token), outsiderHints = [];
  recipientSocket.on("domain.changed", hint => recipientHints.push(hint));
  outsiderSocket.on("domain.changed", hint => outsiderHints.push(hint));
  const beforeClassQuests = (await mainDb.query("SELECT count(*)::int AS n FROM quests")).rows[0].n;
  const latestTimetable = await http("public", "/v1/me/timetable", { token: a.token });
  const {version: timetableVersion, ...timetableSource} = latestTimetable;
  const newerTimetable = await http("public", "/v1/me/timetable", {
    token: a.token, method: "PUT", body: { ...timetableSource, expectedVersion: timetableVersion },
  });
  await until(() => hints.some(h => h.type === "timetable.changed" && h.entityId === a.id && h.version === newerTimetable.version), "owner timetable invalidation hint");
  const timetableHint = hints.find(h => h.type === "timetable.changed" && h.version === newerTimetable.version);
  assert.deepEqual(Object.keys(timetableHint).sort(), ["entityId", "id", "type", "version"]);
  assert.ok(!recipientHints.some(h => h.type === "timetable.changed"));
  assert.ok(!outsiderHints.some(h => h.type === "timetable.changed"));
  const timetableOutboxCount = async () => (await mainDb.query("SELECT count(*)::int AS n FROM outbox WHERE envelope->>'type'='timetable.changed'")).rows[0].n;
  const beforeStaleTimetable = await timetableOutboxCount();
  await http("public", "/v1/me/timetable", { token: a.token, method: "PUT", status:409, body:{...timetableSource,expectedVersion:timetableVersion} });
  assert.equal(await timetableOutboxCount(), beforeStaleTimetable);
  assert.equal((await mainDb.query("SELECT count(*)::int AS n FROM quests")).rows[0].n, beforeClassQuests);
  assert.deepEqual((await http("public", "/v1/me/timetable", {token:a.token})).entries, timetableSource.entries);
  log("timetable save → owner-only ID/version hint; stale save produces no signal or duplicated class quest rows");

  await http("public", "/v1/meetups", { status: 401 });
  await http("admin", "/v1/meetups", { token: admin.token, status: 404 });
  const meetupStart = new Date(Date.now() + 86400000);
  meetupStart.setUTCHours(12, 0, 0, 0);
  const meetup = await http("public", "/v1/meetups", {
    token: a.token, method: "POST", status: 201,
    body: { friendId: b.id, title: "Private concrete plan", startsAt: meetupStart.toISOString(),
      endsAt: new Date(+meetupStart + 3600000).toISOString(), locationName: "Campus entrance" },
  });
  assert.equal(meetup.status, "pending");
  assert.ok((await http("public", "/v1/meetups", { token: b.token })).items.some(m => m.id === meetup.id));
  assert.ok(!(await http("public", "/v1/meetups", { token: outsider.token })).items.some(m => m.id === meetup.id));
  await http("public", `/v1/meetups/${meetup.id}/respond`, {
    token: outsider.token, method: "POST", status: 404,
    body: { action: "accept", expectedVersion: meetup.version },
  });
  const acceptedPlans = await Promise.all([1, 2].map(() => http("public", `/v1/meetups/${meetup.id}/respond`, {
    token: b.token, method: "POST", status: 201,
    body: { action: "accept", expectedVersion: meetup.version },
  })));
  assert.equal(acceptedPlans[0].status, "accepted");
  assert.equal(acceptedPlans[0].partyId, acceptedPlans[1].partyId);
  assert.equal(acceptedPlans[0].questId, acceptedPlans[1].questId);
  const privatePartyId = acceptedPlans[0].partyId;
  for (const user of [a, b]) {
    const sharedParty = (await http("public", "/v1/parties", { token: user.token })).items.find(p => p.id === privatePartyId);
    assert.equal(sharedParty.visibility, "private");
    assert.equal(sharedParty.memberCount, 2);
    assert.ok((await http("public", "/v1/quests", { token: user.token })).items.some(q => q.id === acceptedPlans[0].questId));
  }
  assert.ok(!(await http("public", "/v1/parties", { token: outsider.token })).items.some(p => p.id === privatePartyId));
  await http("public", `/v1/parties/${privatePartyId}/join`, { token: outsider.token, method: "POST", status: 404 });
  await until(() => hints.some(h => h.type === "meetup.changed" && h.entityId === meetup.id && h.version === acceptedPlans[0].version)
    && recipientHints.some(h => h.type === "meetup.changed" && h.entityId === meetup.id && h.version === acceptedPlans[0].version), "private meetup socket hints");
  assert.ok(!outsiderHints.some(h => h.entityId === meetup.id));
  assert.equal((await mainDb.query("SELECT count(*) FROM quests WHERE party_id=$1", [privatePartyId])).rows[0].count, "1");
  log("concrete friend plan → concurrent acceptance → one private party/quest; both participant hints, outsider denial");

  const overlapProposal = await http("public", "/v1/meetups", {
    token: a.token, method: "POST", status: 201,
    body: { friendId: b.id, title: "Competing plan", startsAt: meetupStart.toISOString(),
      endsAt: new Date(+meetupStart + 1800000).toISOString(), locationName: "Another place" },
  });
  const overlapFailure = await http("public", `/v1/meetups/${overlapProposal.id}/respond`, {
    token: b.token, method: "POST", status: 409,
    body: { action: "accept", expectedVersion: overlapProposal.version },
  });
  assert.equal(overlapFailure.code, "SCHEDULE_CONFLICT");
  const classStart = new Date(+meetupStart + 2 * 3600000);
  const seoulDay = new Date(+classStart + 9 * 3600000);
  const currentBTimetable = await http("public", "/v1/me/timetable", { token: b.token });
  await http("public", "/v1/me/timetable", {
    token: b.token, method: "PUT",
    body: { expectedVersion: currentBTimetable.version,
      semesterStartsOn: seoulDay.toISOString().slice(0, 10), semesterEndsOn: seoulDay.toISOString().slice(0, 10),
      entries: [{id: randomUUID(), title: "Private course title must not leak", weekday: seoulDay.getUTCDay() || 7,
        startMinute: seoulDay.getUTCHours() * 60, endMinute: (seoulDay.getUTCHours() + 1) * 60, locationName: "Private classroom"}] },
  });
  const classProposal = await http("public", "/v1/meetups", {
    token: a.token, method: "POST", status: 201,
    body: { friendId: b.id, title: "Class conflict probe", startsAt: classStart.toISOString(),
      endsAt: new Date(+classStart + 1800000).toISOString(), locationName: "Public meeting point" },
  });
  const classFailure = await http("public", `/v1/meetups/${classProposal.id}/respond`, {
    token: b.token, method: "POST", status: 409,
    body: { action: "accept", expectedVersion: classProposal.version },
  });
  assert.equal(classFailure.code, "SCHEDULE_CONFLICT");
  assert.ok(!JSON.stringify(classFailure).includes("Private course"));
  assert.equal((await http("public", "/v1/meetups", { token: a.token })).items.find(m => m.id === classProposal.id).status, "pending");
  log("latest registered classes and accepted plans prevent conflicting confirmation without leaking schedule details");

  const privateStart = new Date(+meetupStart + 2 * 86400000), privateEnd = new Date(+privateStart + 3600000);
  const privateEvent = await http("public", "/v1/private-events", {
    token: a.token, method: "POST", status: 201,
    body: { title: "Owner-only private calendar", description: "Personal confidential detail", startsAt: privateStart.toISOString(), endsAt: privateEnd.toISOString(), locationName: "" },
  });
  await http("public", "/v1/private-events", { status: 401 });
  await http("admin", "/v1/private-events", { token: admin.token, status: 404 });
  assert.ok((await http("public", "/v1/private-events", {token:a.token})).items.some(e=>e.id===privateEvent.id));
  for (const user of [b, outsider]) {
    assert.ok(!(await http("public", "/v1/private-events", {token:user.token})).items.some(e=>e.id===privateEvent.id));
    await http("public", `/v1/private-events/${privateEvent.id}`, {token:user.token,method:"PATCH",status:404,body:{expectedVersion:1,title:"Intrusion"}});
    await http("public", `/v1/private-events/${privateEvent.id}`, {token:user.token,method:"DELETE",status:404,body:{expectedVersion:1}});
  }
  assert.ok(!(await http("public", "/v1/events", {token:a.token})).items.some(e=>e.id===privateEvent.id));
  const privateEdited = await http("public", `/v1/private-events/${privateEvent.id}`, {token:a.token,method:"PATCH",body:{expectedVersion:1,title:"Owner edited plan"}});
  assert.equal(privateEdited.version,2);
  await http("public", `/v1/private-events/${privateEvent.id}`, {token:a.token,method:"PATCH",status:409,body:{expectedVersion:1,title:"Stale plan"}});
  const privateProposal=await http("public", "/v1/meetups", {token:a.token,method:"POST",status:201,body:{friendId:b.id,title:"Private calendar overlap",startsAt:privateStart.toISOString(),endsAt:privateEnd.toISOString(),locationName:"Meeting point"}});
  const privateConflict=await http("public", `/v1/meetups/${privateProposal.id}/respond`, {token:b.token,method:"POST",status:409,body:{action:"accept",expectedVersion:1}});
  assert.equal(privateConflict.code,"SCHEDULE_CONFLICT");
  assert.ok(!JSON.stringify(privateConflict).includes("Owner edited"));
  await http("public", `/v1/private-events/${privateEvent.id}`, {token:a.token,method:"DELETE",status:409,body:{expectedVersion:1}});
  await http("public", `/v1/private-events/${privateEvent.id}`, {token:a.token,method:"DELETE",body:{expectedVersion:2}});
  assert.ok(!(await http("public", "/v1/private-events", {token:a.token})).items.some(e=>e.id===privateEvent.id));
  const unblocked=await http("public", `/v1/meetups/${privateProposal.id}/respond`, {token:b.token,method:"POST",status:201,body:{action:"accept",expectedVersion:1}});
  assert.equal(unblocked.status,"accepted");
  await until(()=>hints.some(h=>h.type==="private-event.changed"&&h.entityId===privateEvent.id),"owner-only private calendar hint");
  assert.ok(!recipientHints.some(h=>h.entityId===privateEvent.id));
  assert.ok(!outsiderHints.some(h=>h.entityId===privateEvent.id));
  log("private calendar CRUD/CAS → owner-only hints → conflict rejection → removal permits exact pending plan");

  const request = {
    eventId: event.id,
    activity: "Integration matching",
    timeStart: new Date(Date.parse(startsAt) - 60000).toISOString(),
    timeEnd: new Date(Date.parse(endsAt) + 60000).toISOString(),
    partySize: 2,
    interests: ["campus"],
    autoJoinConsent: true,
  };
  await http("match", "/v1/matches", {
    token: a.token,
    method: "POST",
    status: 201,
    body: request,
  });
  await http("match", "/v1/matches", {
    token: b.token,
    method: "POST",
    status: 201,
    body: request,
  });
  const matched = await until(
    async () => {
      const results = await Promise.all(
        [a, b].map((user) =>
          http("match", "/v1/matches", { token: user.token }),
        ),
      );
      return results.every((result) => result.items[0]?.status === "matched")
        ? results.map((result) => result.items[0])
        : null;
    },
    "two consenting match requests finalize",
    45000,
  );
  assert.equal(matched[0].partyId, matched[1].partyId);
  const batch = (
    await matchDb.query("SELECT * FROM match_batches WHERE party_id=$1", [
      matched[0].partyId,
    ])
  ).rows[0];
  const replay = {
    requestId: batch.id,
    requestIds: batch.request_ids,
    userIds: batch.user_ids,
    title: batch.title,
    eventId: batch.event_id,
    maxMembers: batch.party_size,
    timeStart: batch.time_start.toISOString(),
    timeEnd: batch.time_end.toISOString(),
  };
  const replayed = await http("public", "/v1/internal/parties/match", {
    internal: true,
    method: "POST",
    status: 201,
    body: replay,
  });
  assert.equal(replayed.id, matched[0].partyId);
  await http("public", "/v1/internal/parties/match", {
    internal: true,
    method: "POST",
    status: 409,
    body: { ...replay, requestId: randomUUID() },
  });
  assert.equal(
    Number(
      (
        await mainDb.query(
          "SELECT count(DISTINCT party_id) FROM consumed_match_requests WHERE request_id=ANY($1::uuid[])",
          [batch.request_ids],
        )
      ).rows[0].count,
    ),
    1,
  );
  log(
    "two durable match requests → one main-owned party; replay and reuse invariants",
  );

  const meals = await http("public", "/v1/campus/meals", { token: a.token });
  assert.ok(["available", "unavailable"].includes(meals.status));
  assert.ok(Array.isArray(meals.items));
  assert.match(meals.sourceUrl, /^https:\/\/snuco\.snu\.ac\.kr\//);
  const shuttle = await http("public", "/v1/campus/shuttle?routeId=41946", {
    token: a.token,
  });
  assert.ok(
    ["available", "no_vehicles", "unavailable"].includes(shuttle.status),
  );
  assert.equal(shuttle.positionKind, "schematic");
  assert.ok(Array.isArray(shuttle.vehicles));
  assert.equal(shuttle.observedAt, null);
  log(
    `real feed response contracts (meals=${meals.status}, shuttle=${shuttle.status}; unavailable is not fabricated success)`,
  );
  const fixturePid = (await mainDb.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
  await adminDb.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>$2",
    [dbNames[0], fixturePid],
  );
  await healthy("public");
  await healthy("admin");
  await http("public", "/v1/events", { token: a.token });
  log("public/admin runtimes survive lost database connections and reconnect");
  console.log(
    "PASS cross-service smoke complete. Real Google sign-in and physical-device behavior remain unverified.",
  );
} finally {
  for (const socket of sockets) socket.disconnect();
  for (const { child } of children)
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGTERM");
  await Promise.all(
    children.map(async ({ child }) => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        sleep(5000),
      ]);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await new Promise((resolve) => child.once("exit", resolve));
      }
    }),
  );
  await mainDb.end();
  await matchDb.end();
  for (const name of createdDb) {
    await adminDb.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()",
      [name],
    );
    await adminDb.query(`DROP DATABASE "${name}"`);
  }
  await adminDb.end();
  for (const redis of ownedRedis) {
    assert.equal(
      await redis.get(marker),
      run,
      "Redis ownership changed; refusing cleanup",
    );
    await redis.flushdb();
  }
  cache.disconnect();
  queue.disconnect();
  console.log(
    "PASS owned test processes, temporary databases and isolated Redis indexes cleaned",
  );
}
