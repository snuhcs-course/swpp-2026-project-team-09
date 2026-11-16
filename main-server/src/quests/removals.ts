/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Prisma } from '../generated/prisma/client.js';

// Whether the Leader removed the User from the Quest and the User has not entered it since (QuestRemoval).
export async function removed(tx: Prisma.TransactionClient, questId: string, userId: string): Promise<boolean> {
  return (await tx.questRemoval.count({ where: { questId, userId } })) > 0;
}
