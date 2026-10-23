/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-23  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { globalEventAnnouncersQuery, globalEventsQuery, questsQuery, recruitingQuestsQuery } from '@/api/queries';
import { askAgain, type ScreenData } from '@/api/screen-data';
import type { GlobalEvent, Quest } from '@/api/types';
import type { RecruitingQuest } from '@/api/party-types';
import { now } from '@/clock';
import type { EventSources } from './adapter';

type Results = [
  UseQueryResult<GlobalEvent[]>,
  UseQueryResult<{ eventId: string; announcer: string }[]>,
  UseQueryResult<RecruitingQuest[]>,
  UseQueryResult<Quest[]>,
];

// The list waits for the Global Events and fails with them. What the cards add to an event, its source, its recruiting
// Quests and whether the User holds a Quest for it, is left out while it is missing.
function combine(results: Results): ScreenData<EventSources> {
  const [events, announcers, recruiting, quests] = results;
  return {
    data:
      events.data === undefined
        ? undefined
        : {
            events: events.data,
            announcers: announcers.data ?? [],
            recruiting: recruiting.data ?? [],
            quests: quests.data ?? [],
            now: now(),
          },
    isPending: events.isPending,
    isError: events.isError,
    refetch: askAgain(results),
  };
}

type ExtraResults = [
  UseQueryResult<{ eventId: string; announcer: string }[]>,
  UseQueryResult<RecruitingQuest[]>,
  UseQueryResult<Quest[]>,
];

// What the cards add to Global Events that came from elsewhere, such as the Assistant's cards, which the server filled:
// the list of events is not fetched again, and what is missing is left out as on the tab.
export function useSourcesFor(events: readonly GlobalEvent[]): EventSources {
  return useQueries({
    queries: [globalEventAnnouncersQuery, recruitingQuestsQuery, questsQuery],
    combine: ([announcers, recruiting, quests]: ExtraResults): EventSources => ({
      events,
      announcers: announcers.data ?? [],
      recruiting: recruiting.data ?? [],
      quests: quests.data ?? [],
      now: now(),
    }),
  });
}

export function useEventSources(): ScreenData<EventSources> {
  return useQueries({
    queries: [globalEventsQuery, globalEventAnnouncersQuery, recruitingQuestsQuery, questsQuery],
    combine,
  });
}
