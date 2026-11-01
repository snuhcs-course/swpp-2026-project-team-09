/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type PrismaService } from '../common/prisma.service.js';
import { type Prisma } from '../generated/prisma/client.js';

// Comparing a post with the events and publishing it are one statement to the other servers: a lock is taken for the
// transaction, so that of two posts of one event the second sees the first. It may wait for another server's post. An
// Administrator's action on a session takes it too. No call to a model is made under it.
const STEP_TRANSACTION = { timeout: 30_000 };
const STEP_LOCK = 8008;

export function withStepLock<T>(prisma: PrismaService, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${STEP_LOCK}::bigint)`;
    return work(tx);
  }, STEP_TRANSACTION);
}
