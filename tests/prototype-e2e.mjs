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
  { token, body, method = "GET", status = 200, internal = false } = {},
) {
  const response = await fetch(bases[service] + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(internal ? { "x-internal-key": internalKey } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(18000),
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
