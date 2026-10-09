/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { myPartyQuery, partiesQuery, questsQuery } from '@/api/queries';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { MyParty, Party, Quest } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { type QuestRowView, toQuestRows } from './adapter';

type Results = [UseQueryResult<Quest[]>, UseQueryResult<MyParty | null>, UseQueryResult<Party[]>];

// Defined outside the hook, so that it runs again only when an answer changes. A User in no Party is no failure: the
// rows are complete without one.
function combine(results: Results): ScreenData<QuestRowView[]> {
  const [quests, myParty, parties] = results;
  const isPending = somePending(results);
  const isError = someFailed(results);
  const ready = !isPending && !isError;
  return {
    data: ready
      ? toQuestRows({
          quests: quests.data ?? [],
          myParty: myParty.data ?? null,
          parties: parties.data ?? [],
          meId: myUserId(),
          now: now(),
        })
      : undefined,
    isPending,
    isError,
    refetch: askAgain(results),
  };
}

// The rows of the Quest list: the User's Parties and today's classes, the earliest first.
export function useQuestRows(): ScreenData<QuestRowView[]> {
  return useQueries({ queries: [questsQuery, myPartyQuery, partiesQuery], combine });
}
