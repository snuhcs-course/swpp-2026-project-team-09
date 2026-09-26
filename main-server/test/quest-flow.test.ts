import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Database } from "../src/modules/database";
import { SocialService } from "../src/modules/social";

function status(expected: number) {
  return (error: any) => error.getStatus?.() === expected;
}

test(
  "party metadata and versioned shared-plan lifecycle",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async (t) => {
    const db = new Database();
    await db.onModuleInit();
    const social = new SocialService(db);
    const users = Array.from({ length: 3 }, () => randomUUID());
    const parties: string[] = [];
    const plan = {
      title: "Shared plan fixture",
      startsAt: "2026-10-01T01:00:00Z",
      endsAt: "2026-10-01T02:00:00Z",
      locationName: "Test location",
    };
    try {
      for (const id of users)
        await db.prisma.user.create({
          data: {
            id,
            google_sub: `quest-test-${id}`,
            email: `${id}@snu.ac.kr`,
            display_name: "Test member",
          },
        });
      const party = await social.createParty(users[0], {
        title: "Shared-plan test",
        maxMembers: 2,
      });
      parties.push(party.id);
      await social.join(users[1], party.id);
      await t.test(
        "nonmembers see capacity and membership metadata without identities or preferences",
        async () => {
          const outsider = (await social.listParties(users[2])).items.find(
            (p) => p.id === party.id,
          )!;
          assert.equal(outsider.memberCount, 2);
          assert.equal(outsider.isMember, false);
          assert.equal(outsider.eventId, null);
          assert.deepEqual(outsider.members, []);
          assert.equal(Object.hasOwn(outsider, "sharingEnabled"), false);
          const member = (await social.listParties(users[0])).items.find(
            (p) => p.id === party.id,
          )!;
          assert.equal(member.isMember, true);
          assert.equal(member.memberCount, member.members.length);
          await assert.rejects(
            () => social.join(users[2], party.id),
            status(409),
          );
        },
      );
      const quest = await social.saveQuest(users[0], {
        ...plan,
        partyId: party.id,
      });
      assert.equal(quest.status, "active");
      assert.equal(quest.version, 1);
      await t.test(
        "only current members may read, create or edit shared plans",
        async () => {
          assert.equal(
            (await social.quests(users[2])).items.some(
              (q) => q.id === quest.id,
            ),
            false,
          );
          await assert.rejects(
            () => social.saveQuest(users[2], { ...plan, partyId: party.id }),
            status(403),
          );
          await assert.rejects(
            () =>
              social.saveQuest(
                users[2],
                { title: "Outsider edit", expectedVersion: 1 },
                quest.id,
              ),
            status(403),
          );
          await assert.rejects(
            () =>
              social.saveQuest(
                users[0],
                { title: "Missing version" },
                quest.id,
              ),
            status(400),
          );
        },
      );
      let current = quest;
      await t.test(
        "two same-version member edits have one winner and no silent overwrite",
        async () => {
          const results = await Promise.allSettled([
            social.saveQuest(
              users[0],
              { title: "First edit", expectedVersion: 1 },
              quest.id,
            ),
            social.saveQuest(
              users[1],
              { title: "Second edit", expectedVersion: 1 },
              quest.id,
            ),
          ]);
          assert.equal(
            results.filter((r) => r.status === "fulfilled").length,
            1,
          );
          const loser = results.find(
            (r) => r.status === "rejected",
          ) as PromiseRejectedResult;
          assert.equal(loser.reason.getStatus(), 409);
          assert.equal(loser.reason.getResponse().code, "VERSION_CONFLICT");
          current = (await social.quests(users[0])).items.find(
            (q) => q.id === quest.id,
          )!;
          assert.equal(current.version, 2);
          await assert.rejects(
            () =>
              social.saveQuest(
                users[0],
                { status: "cancelled", expectedVersion: 1 },
                quest.id,
              ),
            status(409),
          );
        },
      );
      await t.test(
        "cancellation is version checked, preserves contents and makes the plan read-only",
        async () => {
          await assert.rejects(
            () =>
              social.saveQuest(
                users[0],
                {
                  status: "cancelled",
                  expectedVersion: current.version,
                  title: "Mixed edit",
                },
                quest.id,
              ),
            status(400),
          );
          const cancelled = await social.saveQuest(
            users[1],
            { status: "cancelled", expectedVersion: current.version },
            quest.id,
          );
          assert.equal(cancelled.status, "cancelled");
          assert.equal(cancelled.title, current.title);
          assert.equal(cancelled.version, current.version + 1);
          for (const patch of [
            { title: "Late edit" },
            { status: "active", title: "Restore" },
            { status: "cancelled" },
          ]) {
            await assert.rejects(
              () =>
                social.saveQuest(
                  users[0],
                  { ...patch, expectedVersion: cancelled.version },
                  quest.id,
                ),
              (error) =>
                (error as any).getResponse().code === "QUEST_CANCELLED",
            );
          }
          const hints = await db.prisma.outbox.findMany({
            where: { envelope: { path: ["entityId"], equals: quest.id } },
            orderBy: { sequence: "asc" },
          });
          assert.equal(hints.length, 3);
          assert.deepEqual((hints.at(-1)!.envelope as any).audience, {
            kind: "users",
            userIds: [users[0], users[1]],
          });
        },
      );
      await t.test(
        "queued membership departure is authorized before the following quest write",
        async () => {
          const active = await social.saveQuest(users[0], {
            ...plan,
            partyId: party.id,
          });
          let release!: () => void, acquired!: (pid: number) => void;
          const releaseGate = new Promise<void>((resolve) => {
            release = resolve;
          });
          const acquiredGate = new Promise<number>((resolve) => {
            acquired = resolve;
          });
          const held = db.tx(async (lock) => {
            const [backend] = await lock.$queryRaw<
              { pid: number }[]
            >`SELECT pg_backend_pid() AS pid`;
            await lock.$queryRaw`SELECT id FROM parties WHERE id=${party.id}::uuid FOR UPDATE`;
            acquired(backend.pid);
            await releaseGate;
          });
          let leave: Promise<unknown> | undefined,
            edit: Promise<unknown> | undefined;
          try {
            const pid = await Promise.race([
              acquiredGate,
              held.then(() => {
                throw Error("Lock transaction exited before acquisition");
              }),
            ]);
            async function waitForBlocked(count: number) {
              for (let i = 0; i < 100; i++) {
                const blocked = await db.prisma.$queryRaw<{ count: bigint }[]>`
                  WITH RECURSIVE waiting AS (
                    SELECT pid FROM pg_stat_activity WHERE ${pid}::int=ANY(pg_blocking_pids(pid))
                    UNION SELECT a.pid FROM pg_stat_activity a JOIN waiting w ON w.pid=ANY(pg_blocking_pids(a.pid))
                  ) SELECT count(DISTINCT pid) FROM waiting`;
                if (Number(blocked[0].count) >= count) return;
                await new Promise((resolve) => setTimeout(resolve, 10));
              }
              throw new Error("Expected party-row lock wait did not occur");
            }
            leave = social.leave(users[1], party.id);
            await waitForBlocked(1);
            edit = social.saveQuest(
              users[1],
              { title: "After leaving", expectedVersion: active.version },
              active.id,
            );
            // Attach rejection handling before releasing the lock.
            const denied = assert.rejects(() => edit!, status(403));
            await waitForBlocked(2);
            release();
            await held;
            await leave;
            await denied;
            const unchanged = (await social.quests(users[0])).items.find(
              (q) => q.id === active.id,
            )!;
            assert.equal(unchanged.version, active.version);
            assert.equal(
              (await social.quests(users[1])).items.some(
                (q) => q.id === active.id,
              ),
              false,
            );
            await assert.rejects(
              () =>
                social.saveQuest(
                  users[1],
                  { status: "cancelled", expectedVersion: active.version },
                  active.id,
                ),
              status(403),
            );
          } finally {
            release();
            await held;
            await Promise.allSettled(
              [leave, edit].filter(Boolean) as Promise<unknown>[],
            );
          }
        },
      );
    } finally {
      const questIds = (
        await db.prisma.quest.findMany({
          where: { party_id: { in: parties } },
          select: { id: true },
        })
      ).map((r) => r.id);
      await db.prisma.quest.deleteMany({
        where: { party_id: { in: parties } },
      });
      await db.prisma.outbox.deleteMany({
        where: {
          OR: [...parties, ...questIds].map((id) => ({
            envelope: { path: ["entityId"], equals: id },
          })),
        },
      });
      await db.prisma.party.deleteMany({ where: { id: { in: parties } } });
      await db.prisma.user.deleteMany({ where: { id: { in: users } } });
      await db.onModuleDestroy();
    }
  },
);
