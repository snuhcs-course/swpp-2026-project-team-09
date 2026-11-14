/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ComponentProps, useEffect, useState } from 'react';
import type { PlanInput } from '@/api/assistant-types';
import { useToast } from '@/design-system';
import { withAge } from '@/features/friends/adapter';
import { useFriends } from '@/features/friends/use-friends';
import { withBound, withOrigin, withoutPerson, withPerson } from '@/features/assistant/plan-input';
import type { BandBound } from '@/features/assistant/time-band';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { waitForPlace } from '@/features/places/picked-place';
import type { FriendChoices } from './friend-choices';

type Choice = ComponentProps<typeof FriendChoices>['friends'][number];

// How long the time chip keeps the focus on the band's end handle.
const FOCUS_MS = 2000;

export interface Corrections {
  // The list of Friends to add is open.
  adding: boolean;
  toggleAdding: () => void;
  // The User's Friends who are not in the conditions.
  choices: readonly Choice[];
  choose: (userId: string) => void;
  remove: (userId: string) => void;
  chooseOrigin: () => void;
  focus: BandBound | null;
  focusUntil: () => void;
  drop: (bound: BandBound, time: string) => void;
}

function useChoices(input: PlanInput): Choice[] {
  const { data = [] } = useFriends();
  return data
    .filter(({ id }) => !input.people.some(({ userId }) => userId === id))
    .map(({ id, name, line, minutesOld }) => ({ id, name, line: withAge(line, minutesOld) }));
}

// The band's end handle in focus for a while after the time chip is pressed, a press anew starting the while again.
function useFocus(): { focus: BandBound | null; focusUntil: () => void } {
  const [pressed, setPressed] = useState<{ at: BandBound } | null>(null);
  useEffect(() => {
    const timer =
      pressed === null
        ? null
        : setTimeout(() => {
            setPressed(null);
          }, FOCUS_MS);
    return (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [pressed]);
  return {
    focus: pressed?.at ?? null,
    focusUntil: () => {
      setPressed({ at: 'until' });
    },
  };
}

// What the card's controls do to the conditions of the answer on screen: each change asks for a recalculation.
export function useCorrections({ change }: ShownAnswer, input: PlanInput): Corrections {
  const [adding, setAdding] = useState(false);
  const showToast = useToast();
  return {
    adding,
    toggleAdding: () => {
      setAdding((open) => !open);
    },
    choices: useChoices(input),
    choose: (userId) => {
      setAdding(false);
      change((shown) => withPerson(shown, userId));
    },
    remove: (userId) => {
      change((shown) => withoutPerson(shown, userId));
    },
    chooseOrigin: () => {
      waitForPlace(({ placeId }) => {
        if (placeId === null) {
          showToast('건물을 골라 주세요');
        } else {
          change((shown) => withOrigin(shown, placeId));
        }
      });
      router.push('/place-map');
    },
    ...useFocus(),
    drop: (bound, time) => {
      change((shown) => withBound(shown, bound, time), 'drag');
    },
  };
}
