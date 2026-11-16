/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactElement, type ReactNode, use, useState } from 'react';
import type { WatchedInterest } from '@/api/interest-types';
import { classesQuery, friendsQuery, interestsQuery } from '@/api/queries';
import { myUserId } from '@/auth/sign-in';
import { FIRST_RUN_KEY } from '@/features/first-run/use-first-run';
import { readFirstRun } from '@/storage/first-run';
import { endTabTour, readTabTour, type TabTourKept } from '@/storage/tab-tour';
import { firstRunDone, TOUR_STEPS } from './rules';

export interface TabTour {
  // The step shown, from 0, or null while the tour is not shown.
  step: number | null;
  // The next step, or the end after the last: the phone remembers it was seen.
  next: () => void;
  // "건너뛰기": closed for now. It comes again the next time the app starts, until it is seen or turned off.
  skip: () => void;
  // "다시 보지 않기": closed, and the phone remembers it.
  never: () => void;
  // From 내 정보: the tour from its first step, whatever the phone remembers.
  replay: () => void;
}

const TabTourContext = createContext<TabTour | null>(null);

const TAB_TOUR_KEY = 'tab-tour';

function lengthOf(list: readonly unknown[]): number {
  return list.length;
}

function interestCountOf(interests: WatchedInterest[] | null): number | null {
  return interests === null ? null : interests.length;
}

// Whether the first run is done with the User. The same queries as the first run's own (`useFirstRun`), so that a card
// answered on the main screen reaches the tour at once; asked only while the tour waits for it.
function useFirstRunDone(asked: boolean): boolean {
  const waiting = useQuery({
    queryKey: [FIRST_RUN_KEY, myUserId()],
    queryFn: readFirstRun,
    staleTime: Infinity,
    enabled: asked,
  });
  const enabled = asked && (waiting.data?.length ?? 0) > 0;
  const facts = {
    classes: useQuery({ ...classesQuery, enabled, select: lengthOf }).data,
    interests: useQuery({ ...interestsQuery, enabled, select: interestCountOf }).data,
    friends: useQuery({ ...friendsQuery, enabled, select: lengthOf }).data,
  };
  return waiting.isSuccess && firstRunDone(waiting.data, facts);
}

// The tour of the bottom tabs for the signed-in place (HE H7, H8). It waits after Onboarding on this phone until the
// first run (P05 ticket 09) is done with the User: the first run asks for what the app needs, and the tour then shows
// where things are. If another first step comes before the tour, its wait goes in `useFirstRunDone` beside the first
// run's. 건너뛰기 is kept only while the app runs, here, so that the tour comes again on the next start.
export function TabTourProvider({ children }: { children: ReactNode }): ReactElement {
  const queryClient = useQueryClient();
  const key = [TAB_TOUR_KEY, myUserId()];
  const kept = useQuery({ queryKey: key, queryFn: readTabTour, staleTime: Infinity }).data ?? null;
  const [step, setStep] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const waits = kept === 'waiting' && !skipped;
  const firstRunDoneWithUser = useFirstRunDone(waits && !replaying);
  const shown = replaying || (waits && firstRunDoneWithUser);
  const close = (): void => {
    setReplaying(false);
    setStep(0);
  };
  const end = (): void => {
    close();
    queryClient.setQueryData<TabTourKept>(key, 'seen');
    void endTabTour().catch(() => null);
  };
  const tour: TabTour = {
    step: shown ? step : null,
    next: () => {
      if (step + 1 < TOUR_STEPS) {
        setStep(step + 1);
      } else {
        end();
      }
    },
    skip: () => {
      close();
      setSkipped(true);
    },
    never: end,
    replay: () => {
      setStep(0);
      setReplaying(true);
    },
  };
  return <TabTourContext value={tour}>{children}</TabTourContext>;
}

export function useTabTour(): TabTour {
  const tour = use(TabTourContext);
  if (tour === null) {
    throw new Error('The tab tour must be used inside a TabTourProvider');
  }
  return tour;
}
