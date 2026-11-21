/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type KeptKind, type KeptQuest } from '../../quests/kept-quests.js';

// The asker's Quests of the day a plan is for that the plan touches, named in its answer whether or not they limit it
// (P05 ticket 17): those of the kind asked for, and those with a Friend asked for. The one the plan sets aside is its
// `planSet`, not related.

// The most related Quests an answer names.
export const RELATED_MAX = 3;

export function relatedOf(
  kept: readonly KeptQuest[],
  {
    kinds,
    friendIds,
    around,
    setAside,
  }: { kinds: readonly KeptKind[]; friendIds: readonly string[]; around: Date; setAside: string | null },
): KeptQuest[] {
  const asked = new Set(friendIds);
  return kept
    .filter(
      (quest) =>
        quest.questId !== setAside &&
        (kinds.includes(quest.kind) || quest.people.some(({ userId }) => asked.has(userId))),
    )
    .toSorted(
      (one, other) =>
        Math.abs(one.start.getTime() - around.getTime()) - Math.abs(other.start.getTime() - around.getTime()),
    )
    .slice(0, RELATED_MAX);
}
