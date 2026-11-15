/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type QueryClient, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/api/client';
import type { InterestMatches } from '@/api/interest-types';
import type { RecruitingQuest } from '@/api/party-types';
import {
  globalEventsQuery,
  interestMatchesQuery,
  interestsQuery,
  lobbyQuery,
  notificationsQuery,
  recruitingQuestsQuery,
} from '@/api/queries';
import type { ScreenData } from '@/api/screen-data';
import type { GlobalEvent, LatLng } from '@/api/types';
import type { KeptNotification } from '@/api/waiting-types';
import { now } from '@/clock';
import { useToast } from '@/design-system';
import { useAnswerSwitch } from '@/features/assistant/answer-switch';
import type { Chat } from '@/features/assistant/use-chat';
import { useNow } from '@/hooks/use-now';
import { keepOpenedMarks, readOpenedMarks } from '@/storage/opened-marks';
import type { CardView } from './adapter';
import { answerInputOf, cardsWithMarks, type InterestMark, marksOf, sourcesOf, toldItems } from './interest-marks';

// The interest marks of the everyday map while the switch of the answer on the map is on (P05 ticket 13), and what a
// press on one does. With the switch off nothing is asked and the map is as before.

const OPENED_KEY = ['opened-marks'] as const;
// The items opened on this phone, read once per sign-in: the cache is cleared at a sign-out.
const openedQuery = queryOptions({ queryKey: OPENED_KEY, queryFn: readOpenedMarks, staleTime: Infinity });

const MINUTE_MS = 60_000;
const NOT_ANSWERED = '답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요';
const NO_MARKS: ReadonlyMap<string, InterestMark> = new Map();
// Kept once, so that what is read anew keeps the marks and the cards as they were.
const NO_NOTIFICATIONS: readonly KeptNotification[] = [];
const NO_RECRUITING: readonly RecruitingQuest[] = [];
const NONE_OPENED: readonly string[] = [];

export interface InterestMarks {
  // Null for the map as before: the switch off, a main server without the matches (404), or a failed read.
  marks: readonly InterestMark[] | null;
  // The switch is on and the matches or the watched interests are still being read.
  pending: boolean;
  recruiting: readonly RecruitingQuest[];
}

interface Read {
  matches: InterestMatches;
  watchesSomething: boolean;
  events: readonly GlobalEvent[];
  recruiting: readonly RecruitingQuest[];
  kept: readonly KeptNotification[];
  opened: readonly string[] | null;
  at: number;
}

function marksFrom({ matches, watchesSomething, events, recruiting, kept, opened, at }: Read): InterestMark[] {
  return marksOf({
    sources: sourcesOf(matches, watchesSomething, events, new Date(at)),
    events,
    recruiting,
    told: toldItems(kept),
    opened: opened === null ? null : new Set(opened),
  });
}

// The marks from the matches, the hashtags and the watched interests, the events and recruiting Quests the map
// draws, the kept Notifications, and the items opened on this phone. A failed read of the Notifications only means no
// "!", and a failed read of the opened items counts as none opened.
export function useInterestMarks(): InterestMarks {
  const on = useAnswerSwitch();
  const at = useNow(MINUTE_MS);
  const matches = useQuery({ ...interestMatchesQuery, enabled: on });
  const watched = useQuery({ ...interestsQuery, enabled: on });
  const hashtags = useQuery({ ...lobbyQuery, enabled: on }).data?.profile.hashtags ?? [];
  const kept = useQuery({ ...notificationsQuery, enabled: on }).data ?? NO_NOTIFICATIONS;
  const events = useQuery({ ...globalEventsQuery, enabled: on });
  const recruiting = useQuery({ ...recruitingQuestsQuery, enabled: on });
  const opened = useQuery({ ...openedQuery, enabled: on });
  const pending = on && [matches, watched, events, recruiting].some(({ isPending }) => isPending);
  const found = on && !pending && !matches.isError ? (matches.data ?? null) : null;
  const watchesSomething = hashtags.length > 0 || (watched.data?.length ?? 0) > 0;
  const openedIds = opened.data ?? (opened.isError ? NONE_OPENED : null);
  const marks = useMemo(
    () =>
      found === null
        ? null
        : marksFrom({
            matches: found,
            watchesSomething,
            events: events.data ?? [],
            recruiting: recruiting.data ?? NO_RECRUITING,
            kept,
            opened: openedIds,
            at,
          }),
    [found, watchesSomething, events.data, recruiting.data, kept, openedIds, at],
  );
  const shownRecruiting = recruiting.data ?? NO_RECRUITING;
  return useMemo(() => ({ marks, pending, recruiting: shownRecruiting }), [marks, pending, shownRecruiting]);
}

// The map's cards while the switch is on: those the marks keep, none yet while the marks are read, or as before.
export function withInterestMarks(
  cards: ScreenData<CardView[]>,
  { marks, pending, recruiting }: InterestMarks,
  at: Date,
): ScreenData<CardView[]> {
  if (pending) {
    return { ...cards, data: undefined, isPending: true };
  }
  return marks === null || cards.data === undefined
    ? cards
    : { ...cards, data: cardsWithMarks(cards.data, marks, recruiting, at) };
}

function keepOpened(queryClient: QueryClient, items: readonly string[]): void {
  queryClient.setQueryData<string[]>(OPENED_KEY, (last) => [...new Set([...(last ?? []), ...items])]);
  keepOpenedMarks(items).catch(() => null);
}

export interface MarkPresses {
  // The marks by the id of the card whose marker stands for each.
  byId: ReadonlyMap<string, InterestMark>;
  // A press on the map: one on a mark opens its answer, any other goes on to `onThing`.
  pressing: (onThing: (id: string) => void) => (id: string) => void;
}

// A press on a mark gives the same answer as asking: the mark's name as the words and the answer of its items, which
// the arrows browse. Its items are kept as opened once the answer is shown, and lose "!". `location` is the User's
// position, which the answer starts from.
export function useMarkPresses(chat: Chat, location: LatLng | null): MarkPresses {
  const { marks } = useInterestMarks();
  const byId = useMemo(() => (marks === null ? NO_MARKS : new Map(marks.map((mark) => [mark.id, mark]))), [marks]);
  const queryClient = useQueryClient();
  const showToast = useToast();
  const open = (mark: InterestMark): void => {
    void chat
      .askApp(mark.title, () => apiClient.recalculateAnswer(answerInputOf(mark, now()), location))
      .then((ended) => {
        if (ended === 'shown') {
          keepOpened(queryClient, mark.items);
        } else if (ended === 'failed') {
          showToast(NOT_ANSWERED);
        }
      });
  };
  return {
    byId,
    pressing: (onThing) => (id) => {
      const mark = byId.get(id);
      if (mark === undefined) {
        onThing(id);
      } else {
        open(mark);
      }
    },
  };
}
