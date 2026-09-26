import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
import { Database } from "../src/modules/database";
import { EventsService } from "../src/modules/events";
import { ProfileService } from "../src/modules/profile";

// pg is used only to provision disposable databases and simulate the pre-Prisma schema.
// Set DATABASE_URL to a disposable PostgreSQL server whose test role can CREATE DATABASE.
test(
  "Prisma migration: fresh concurrent startup and explicit existing-data baseline",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async (t) => {
    const original = process.env.DATABASE_URL!;
    const admin = new Pool({ connectionString: original });
    const names: string[] = [];
    async function databaseUrl() {
      const name = `prisma_test_${randomUUID().replaceAll("-", "")}`;
      await admin.query(`CREATE DATABASE "${name}"`);
      names.push(name);
      const url = new URL(original);
      url.pathname = `/${name}`;
      process.env.DATABASE_URL = url.toString();
      return url.toString();
    }
    async function verifySqlInvariants(db: Database) {
      const indexes = await db.prisma.$queryRaw<
        { indexname: string; indexdef: string }[]
      >`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname IN ('friend_pair','pending_outbox')`;
      assert.match(
        indexes.find((r) => r.indexname === "friend_pair")!.indexdef,
        /LEAST|least/,
      );
      assert.match(
        indexes.find((r) => r.indexname === "pending_outbox")!.indexdef,
        /WHERE.*delivered_at IS NULL/,
      );
      const extension = await db.prisma.$queryRaw<
        { extname: string }[]
      >`SELECT extname FROM pg_extension WHERE extname='postgis'`;
      assert.equal(extension.length, 1);
      await assert.rejects(() =>
        db.prisma.user.create({
          data: {
            id: randomUUID(),
            google_sub: randomUUID(),
            email: `${randomUUID()}@snu.ac.kr`,
            display_name: "Invalid",
            admission_year: 1800,
          },
        }),
      );
      const ids = [randomUUID(), randomUUID()];
      await db.prisma.user.createMany({
        data: ids.map((id) => ({
          id,
          google_sub: id,
          email: `${id}@snu.ac.kr`,
          display_name: "Index fixture",
        })),
      });
      await db.prisma.friendship.create({
        data: { id: randomUUID(), sender_id: ids[0], receiver_id: ids[1] },
      });
      await assert.rejects(
        () =>
          db.prisma.friendship.create({
            data: { id: randomUUID(), sender_id: ids[1], receiver_id: ids[0] },
          }),
        (e: any) => e.code === "P2002",
      );
    }
    async function verifyTransactionalWrites(db: Database) {
      const events = new EventsService(db);
      const externalId = randomUUID();
      const item = {
        externalId,
        title: "Import fixture",
        description: "",
        startsAt: "2026-10-01T00:00:00Z",
        endsAt: "2026-10-01T01:00:00Z",
        locationName: "Test",
      };
      await Promise.all([
        events.import({ items: [item] }),
        events.import({ items: [item] }),
      ]);
      const rows = await db.prisma.event.findMany({
        where: { source: "snu", external_id: externalId },
      });
      assert.equal(rows.length, 1);
      assert.equal(rows[0].version, 2);
      const revision = await db.prisma.eventRevision.findUniqueOrThrow({
        where: { id: 1 },
      });
      const id = randomUUID();
      await assert.rejects(
        () =>
          db.tx(async (c) => {
            await c.event.create({
              data: {
                id,
                title: "Rollback fixture",
                description: "",
                starts_at: new Date(item.startsAt),
                ends_at: new Date(item.endsAt),
                location_name: "Test",
                status: "draft",
              },
            });
            await c.eventRevision.update({
              where: { id: 1 },
              data: { revision: { increment: 1 } },
            });
            await db.hint(c, "event.changed", id, [], 1);
            throw Error("rollback fixture");
          }),
        /rollback fixture/,
      );
      assert.equal(await db.prisma.event.findUnique({ where: { id } }), null);
      assert.equal(
        await db.prisma.outbox.count({
          where: { envelope: { path: ["entityId"], equals: id } },
        }),
        0,
      );
      assert.equal(
        (await db.prisma.eventRevision.findUniqueOrThrow({ where: { id: 1 } }))
          .revision,
        revision.revision,
      );
    }
    try {
      await t.test(
        "two runtimes migrate one fresh database and retain SQL-only constraints",
        async () => {
          await databaseUrl();
          const a = new Database(),
            b = new Database();
          try {
            await Promise.all([a.onModuleInit(), b.onModuleInit()]);
            assert.equal(a.ready && b.ready, true);
            const rows = await a.prisma.$queryRaw<
              { migration_name: string }[]
            >`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`;
            assert.deepEqual(
              rows.map((r) => r.migration_name),
              [
                "0_init",
                "202609270001_friend_meetups",
                "202609270002_private_events",
              ],
            );
            await verifySqlInvariants(a);
            await verifyTransactionalWrites(a);
          } finally {
            await Promise.all([a.onModuleDestroy(), b.onModuleDestroy()]);
          }
        },
      );
      await t.test(
        "legacy data requires explicit baseline and survives migration",
        async () => {
          const url = await databaseUrl();
          const legacy = new Pool({ connectionString: url });
          const id = randomUUID(),
            legacyPartyId = randomUUID();
          const timetable = {
            timezone: "Asia/Seoul",
            semesterStartsOn: "2026-09-01",
            semesterEndsOn: "2026-12-01",
            entries: [],
          };
          try {
            await legacy.query(
              await readFile("migrations/001_initial.sql", "utf8"),
            );
            await legacy.query(
              "INSERT INTO users(id,google_sub,email,display_name,department,profile_version,timetable,timetable_version,location_epoch) VALUES($1,$2,$3,$4,$5,7,$6,4,3)",
              [
                id,
                id,
                `${id}@snu.ac.kr`,
                "Existing edited name",
                "Existing department",
                JSON.stringify(timetable),
              ],
            );
            await legacy.query(
              "INSERT INTO parties(id,title,max_members) VALUES($1,'Legacy party',2)",
              [legacyPartyId],
            );
          } finally {
            await legacy.end();
          }
          const db = new Database();
          try {
            await assert.rejects(
              () => db.onModuleInit(),
              (e: any) => /P3005/.test(e.stderr || e.message),
            );
            assert.equal(db.ready, false);
            // This fixture was created from the exact legacy schema above; production requires its own verification.
            await promisify(execFile)(process.execPath, [
              require.resolve("prisma/build/index.js"),
              "migrate",
              "resolve",
              "--applied",
              "0_init",
              "--config",
              "prisma.config.ts",
            ]);
            await db.onModuleInit();
            assert.equal(
              (
                await db.prisma.party.findUniqueOrThrow({
                  where: { id: legacyPartyId },
                })
              ).visibility,
              "public",
            );
            const profiles = new ProfileService(db);
            assert.equal(
              (await profiles.profile(id)).displayName,
              "Existing edited name",
            );
            assert.equal((await profiles.profile(id)).version, 7);
            assert.deepEqual(await profiles.timetable(id), {
              ...timetable,
              version: 4,
            });
            assert.equal(
              (await db.prisma.user.findUniqueOrThrow({ where: { id } }))
                .location_epoch,
              3,
            );
            assert.equal(
              (
                await profiles.patchProfile(id, {
                  expectedVersion: 7,
                  statusMessage: "After Prisma",
                })
              ).version,
              8,
            );
            await verifySqlInvariants(db);
          } finally {
            await db.onModuleDestroy();
          }
        },
      );
    } finally {
      process.env.DATABASE_URL = original;
      // Only drop uniquely named databases created above on the explicitly supplied test server.
      for (const name of names)
        await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      await admin.end();
    }
  },
);
