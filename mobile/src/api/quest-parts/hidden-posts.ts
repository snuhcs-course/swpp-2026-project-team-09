/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { keepId, readKeptIds } from '@/storage/kept-ids';

// The mock adapter for hiding a post with `관심 없음`, in both builds: the phone keeps the hidden posts' ids, and
// nobody else sees them. Replaced once the main server takes what a User is not interested in.

const HIDDEN = 'snunow.hidden-posts';

export function listHiddenPosts(): Promise<string[]> {
  return readKeptIds(HIDDEN);
}

export async function hidePost(questId: string): Promise<void> {
  await keepId(HIDDEN, questId);
}
