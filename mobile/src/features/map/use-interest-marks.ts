/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type QueryClient, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { apiClient } from '@/api/client';
import type { InterestMatches } from '@/api/interest-types';
import type { RecruitingQuest } from '@/api/party-types';
import {
  globalEventsQuery,
  INTERESTS_KEY,
  interestMatchesQuery,
  interestsQuery,
  lobbyQuery,
  notificationsQuery,
  recruitingQuestsQuery,
} from '@/api/queries';
import type { LocationMissing } from '@/api/refusal-types';
import type { ScreenData } from '@/api/screen-data';
import type { GlobalEvent, LatLng } from '@/api/types';
import type { KeptNotification } from '@/api/waiting-types';
import { now } from '@/clock';
import { useToast } from '@/design-system';
import type { Chat } from '@/features/assistant/use-chat';
import { useNow } from '@/hooks/use-now';
import { keepOpenedMarks, readOpenedMarks } from '@/storage/opened-marks';
import type { CardView } from './adapter';
import { askOf, cardsWithMarks, type InterestMark, marksAlone, marksOf, sourcesOf, toldItems } from './interest-marks';

// The interest marks of the everyday map (P05 ticket 13), and what a press on one does.

const OPENED_KEY = ['opened-marks'] as const;
// The items opened on this phone, read once per sign-in: the cache is cleared at a sign-out.
const openedQuery = queryOptions({ queryKey: OPENED_KEY, queryFn: readOpenedMarks, staleTime: Infinity });

// Where the User is on campus, or why that is not known.
interface Where {
  position: LatLng | null;
  locationMissing: LocationMissing;
}

const MINUTE_MS = 60_000;
const NOT_ANSWERED = '답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요';
const NO_MARKS: ReadonlyMap<string, InterestMark> = new Map();
// Kept once, so that what is read anew keeps the marks and the cards as they were.
const NO_NOTIFICATIONS: readonly KeptNotification[] = [];
const NO_RECRUITING: readonly RecruitingQuest[] = [];
const NONE_OPENED: readonly string[] = [];

export interface InterestMarks {
  // Null for the map without marks: a main server without the matches (404), or a failed read.
  marks: readonly InterestMark[] | null;
  // The matches or the watched interests are still being read.
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
  const at = useNow(MINUTE_MS);
  const matches = useQuery(interestMatchesQuery);
  const watched = useQuery(interestsQuery);
  const hashtags = useQuery(lobbyQuery).data?.profile.hashtags ?? [];
  const kept = useQuery(notificationsQuery).data ?? NO_NOTIFICATIONS;
  const events = useQuery(globalEventsQuery);
  const recruiting = useQuery(recruitingQuestsQuery);
  const opened = useQuery(openedQuery);
  const pending = [matches, watched, events, recruiting].some(({ isPending }) => isPending);
  const found = !pending && !matches.isError ? (matches.data ?? null) : null;
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

// The map's cards: those the marks keep, none yet while the marks are read, or all of them without marks.
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

// The matches change with no signal when the Assistant keeps or drops an interest, or the profile's hashtags are
// saved: the interests are read again after each answer and at each change of the hashtags.
function useMatchesRefresh(bubbles: Chat['bubbles']): void {
  const queryClient = useQueryClient();
  const hashtags = useQuery(lobbyQuery).data?.profile.hashtags.join('\n');
  const answers = bubbles.filter(({ role }) => role === 'assistant').length;
  const state = hashtags === undefined ? null : `${String(answers)}\n${hashtags}`;
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (state === null) {
      return;
    }
    if (last.current !== null && last.current !== state) {
      void queryClient.invalidateQueries({ queryKey: INTERESTS_KEY });
    }
    last.current = state;
  }, [state, queryClient]);
}

// A press on a mark gives the same answer as asking: the mark's name as the words and the answer of its items, which
// the arrows browse. The items the answer shows are kept as opened once it is on screen, and lose "!". `where` is the
// User's position, which the answer starts from, or why it is not known, which the answer says; `cards` are the
// map's, by which a mark sharing its point with another thing leaves the place's card as it is.
export function useMarkPresses(chat: Chat, where: Where, cards: readonly CardView[]): MarkPresses {
  const { marks } = useInterestMarks();
  const byId = useMemo(() => (marks === null ? NO_MARKS : marksAlone(marks, cards)), [marks, cards]);
  const queryClient = useQueryClient();
  const showToast = useToast();
  useMatchesRefresh(chat.bubbles);
  const open = (mark: InterestMark): void => {
    const { input, shown } = askOf(mark, now());
    void chat
      .askApp(mark.title, () => apiClient.recalculateAnswer(input, where.position, where.locationMissing))
      .then((ended) => {
        if (ended === 'shown') {
          keepOpened(queryClient, shown);
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
