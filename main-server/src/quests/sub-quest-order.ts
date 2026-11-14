/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Prisma } from '../generated/prisma/client.js';
import { type SubQuestColumns } from './quests.service.js';

// Sub Quests are read in the order they were created, and the rows of one transaction share its now().
export const inOrder = (
  subQuests: readonly SubQuestColumns[],
  start = Date.now(),
): Prisma.SubQuestCreateWithoutQuestInput[] =>
  subQuests.map((subQuest, index) => ({ ...subQuest, createdAt: new Date(start + index) }));
