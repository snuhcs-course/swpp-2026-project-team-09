/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useState } from 'react';
import type { WatchedInterest } from '@/api/interest-types';
import { classesQuery, friendsQuery, interestsQuery } from '@/api/queries';
import { myUserId } from '@/auth/sign-in';
import { answerFirstRunCard, readFirstRun } from '@/storage/first-run';
import { answeredElsewhere, asksForInterests, cardToShow, type FirstRunCard, type FirstRunFacts } from './rules';

export interface FirstRun {
  // The card to show, while nothing else takes the bottom of the main screen.
  card: FirstRunCard | null;
  // The line over the input that opens the interests card again.
  asksForInterests: boolean;
  openInterests: () => void;
  // The card was answered or skipped: the phone remembers it.
  answer: (card: FirstRunCard) => void;
}

export const FIRST_RUN_KEY = 'first-run';

function lengthOf(list: readonly unknown[]): number {
  return list.length;
}

function interestCountOf(interests: WatchedInterest[] | null): number | null {
  return interests === null ? null : interests.length;
}

// The first run of the signed-in User on the main screen (P05 ticket 09): what the phone keeps of its cards, and the
// Classes, watched interests, and Friends the main server has, asked for only while the User is in the first run.
export function useFirstRun(): FirstRun {
  const queryClient = useQueryClient();
  const key = [FIRST_RUN_KEY, myUserId()];
  const waiting = useQuery({ queryKey: key, queryFn: readFirstRun, staleTime: Infinity }).data ?? null;
  const enabled = waiting !== null;
  const facts: FirstRunFacts = {
    classes: useQuery({ ...classesQuery, enabled, select: lengthOf }).data,
    interests: useQuery({ ...interestsQuery, enabled, select: interestCountOf }).data,
    friends: useQuery({ ...friendsQuery, enabled, select: lengthOf }).data,
  };
  const [again, setAgain] = useState(false);
  const answer = (card: FirstRunCard): void => {
    if (card === 'interests') {
      setAgain(false);
    }
    queryClient.setQueryData<FirstRunCard[] | null>(key, (cards) => cards?.filter((each) => each !== card) ?? null);
    void answerFirstRunCard(card).catch(() => null);
  };
  const answerElsewhere = useEffectEvent(() => {
    for (const card of answeredElsewhere(waiting, facts)) {
      answer(card);
    }
  });
  const elsewhere = answeredElsewhere(waiting, facts).join(' ');
  useEffect(() => {
    if (elsewhere !== '') {
      answerElsewhere();
    }
  }, [elsewhere]);
  const card = cardToShow(waiting, facts, again);
  return {
    card,
    asksForInterests: card === null && asksForInterests(waiting, facts),
    openInterests: () => {
      setAgain(true);
    },
    answer,
  };
}
