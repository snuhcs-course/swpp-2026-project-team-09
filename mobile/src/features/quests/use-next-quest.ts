/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { questsQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import { now } from '@/clock';
import { type NextQuestView, toNextQuest } from './adapter';

// Defined outside the hook, so that it runs again only when the answer changes.
function nextOf(quests: Quest[]): NextQuestView | null {
  return toNextQuest(quests, now());
}

// The User's next Quest by time, for the route the main screen draws when it opens. Null while the Quests are
// loading, after a failure and when no Quest is left today.
export function useNextQuest(): NextQuestView | null {
  return useQuery({ ...questsQuery, select: nextOf }).data ?? null;
}
