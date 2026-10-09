/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { refreshTokenHash } from './sign-in.js';

// Requests sent at the same moment seldom overlap in the database. To make two of them overlap, a test keeps a stored
// row, such as a refresh token, locked, sends the requests so that both wait for that lock, and then releases it.

// Counts the database sessions that wait for the session `holder`, directly or behind another waiting session.
async function waitingSessions(prisma: PrismaClient, holder: number): Promise<number> {
  const [{ count }] = await prisma.$queryRaw<[{ count: number }]>`
    WITH RECURSIVE waiting (pid) AS (
      SELECT pid FROM pg_stat_activity WHERE ${holder}::int = ANY (pg_blocking_pids(pid))
      UNION
      SELECT activity.pid FROM pg_stat_activity activity JOIN waiting ON waiting.pid = ANY (pg_blocking_pids(activity.pid))
    )
    SELECT count(*)::int AS count FROM waiting`;
  return count;
}

async function waitUntilWaiting(prisma: PrismaClient, holder: number, sessions: number): Promise<void> {
  await vi.waitFor(
    async () => {
      expect(await waitingSessions(prisma, holder)).toBe(sessions);
    },
    { timeout: 5000, interval: 10 },
  );
}

// Sends `first` and, once it waits for the locked refresh token, `second`. When both wait, the lock is released, so
// `first` goes on before `second` while `second` is still under way. Answers both.
export function overlap(
  prisma: PrismaClient,
  lockedRefreshToken: string,
  first: () => request.Test,
  second: () => request.Test,
): Promise<[request.Response, request.Response]> {
  const tokenHash = refreshTokenHash(lockedRefreshToken);
  return overlapOnLock(
    prisma,
    (tx) => tx.$queryRaw`SELECT 1 FROM refresh_tokens WHERE token_hash = ${tokenHash} FOR UPDATE`,
    first,
    second,
  );
}

// As overlap(), with a lock of the test's choice, which both requests must wait for.
export async function overlapOnLock(
  prisma: PrismaClient,
  lock: (tx: Prisma.TransactionClient) => Promise<unknown>,
  first: () => request.Test,
  second: () => request.Test,
): Promise<[request.Response, request.Response]> {
  const answers = await prisma.$transaction(
    async (tx) => {
      const [{ pid }] = await tx.$queryRaw<[{ pid: number }]>`SELECT pg_backend_pid() AS pid`;
      await lock(tx);
      // Calling then() sends a request.
      const firstAnswer = first().then((response) => response);
      await waitUntilWaiting(prisma, pid, 1);
      const secondAnswer = second().then((response) => response);
      await waitUntilWaiting(prisma, pid, 2);
      return [firstAnswer, secondAnswer] as const;
    },
    { timeout: 15_000 },
  );
  return Promise.all(answers);
}
