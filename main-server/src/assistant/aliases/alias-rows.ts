/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type PrismaClient } from '../../generated/prisma/client.js';
import { CHAIN_WINDOW_DAYS } from './alias-rules.js';
import { type ChainRow } from './alias-sessions.js';

// The rows the alias chain is counted from (P07 ticket 06): every Place resolution event of the window, with its
// account's onboarding. The server reads the window up to now; ticket 05's replay reads it up to the time it replays
// to, less the labels it scores.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RowWindow {
  // Only rows before it count; left out, every row so far.
  before?: Date;
  excluding?: readonly string[];
}

export async function chainRows(prisma: PrismaClient, { before, excluding = [] }: RowWindow = {}): Promise<ChainRow[]> {
  const end = before ?? new Date();
  const rows = await prisma.resolutionEvent.findMany({
    where: {
      kind: 'place',
      createdAt: {
        gte: new Date(end.getTime() - CHAIN_WINDOW_DAYS * DAY_MS),
        ...(before === undefined ? {} : { lt: before }),
      },
      ...(excluding.length === 0 ? {} : { id: { notIn: [...excluding] } }),
    },
    select: {
      id: true,
      userId: true,
      words: true,
      outcome: true,
      result: true,
      aliasSource: true,
      candidateIds: true,
      chosenId: true,
      createdAt: true,
      user: { select: { onboardedAt: true } },
    },
  });
  return rows.map((row): ChainRow => ({
    id: row.id,
    userId: row.userId,
    onboardedAt: row.user.onboardedAt,
    words: row.words,
    outcome: row.outcome,
    result: row.result,
    aliasSource: row.aliasSource,
    candidateIds: row.candidateIds,
    chosenId: row.chosenId,
    createdAt: row.createdAt,
  }));
}
