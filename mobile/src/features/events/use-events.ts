import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import {
  globalEventAnnouncersQuery,
  globalEventsQuery,
  matchingRequestsQuery,
  questsQuery,
  recruitingQuestsQuery,
} from '@/api/queries';
import { askAgain, type ScreenData } from '@/api/screen-data';
import type { MatchingRequest } from '@/api/matching-types';
import type { GlobalEvent, Quest } from '@/api/types';
import type { RecruitingQuest } from '@/api/party-types';
import { now } from '@/clock';
import type { EventSources } from './adapter';

type Results = [
  UseQueryResult<GlobalEvent[]>,
  UseQueryResult<{ eventId: string; announcer: string }[]>,
  UseQueryResult<RecruitingQuest[]>,
  UseQueryResult<Quest[]>,
  UseQueryResult<MatchingRequest[]>,
];

// The list waits for the Global Events and fails with them. What the cards add to an event, its source, its recruiting
// Quests, whether the User holds a Quest for it and whether the User's request waits, is left out while it is missing.
function combine(results: Results): ScreenData<EventSources> {
  const [events, announcers, recruiting, quests, matching] = results;
  return {
    data:
      events.data === undefined
        ? undefined
        : {
            events: events.data,
            announcers: announcers.data ?? [],
            recruiting: recruiting.data ?? [],
            quests: quests.data ?? [],
            matching: matching.data ?? [],
            now: now(),
          },
    isPending: events.isPending,
    isError: events.isError,
    refetch: askAgain(results),
  };
}

export function useEventSources(): ScreenData<EventSources> {
  return useQueries({
    queries: [globalEventsQuery, globalEventAnnouncersQuery, recruitingQuestsQuery, questsQuery, matchingRequestsQuery],
    combine,
  });
}
