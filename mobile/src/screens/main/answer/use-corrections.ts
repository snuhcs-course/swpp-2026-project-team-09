/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ComponentProps, useEffect, useState } from 'react';
import type { PlanInput } from '@/api/assistant-types';
import { useToast } from '@/design-system';
import { useFriends } from '@/features/friends/use-friends';
import { onlyFriendOf } from '@/features/assistant/meet-input';
import { peopleOf, withBound, withOrigin, withoutPerson, withStart } from '@/features/assistant/plan-input';
import { type BandBound, clockOf, msOf, type Stretch } from '@/features/assistant/time-band';
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
  // The user ids of all the User's Friends.
  friendIds: ReadonlySet<string>;
  // Adds the Friend, and the list stays open until the answer comes.
  choose: (userId: string) => void;
  remove: (userId: string) => void;
  chooseOrigin: () => void;
  focus: BandBound | null;
  focusUntil: () => void;
  drop: (bound: BandBound, time: string) => void;
  // The band dragged whole to a place, or let go there: let go where it started, it goes back and asks nothing.
  move: (at: Stretch, letGo: boolean) => void;
}

function useChoices(input: PlanInput): Pick<Corrections, 'choices' | 'friendIds'> {
  const { data = [] } = useFriends();
  const choices = data
    .filter(({ id }) => !peopleOf(input).some(({ userId }) => userId === id))
    .map(({ id, name, department, position, minutesOld }) => ({ id, name, department, position, minutesOld }));
  return { choices, friendIds: new Set(data.map(({ id }) => id)) };
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

function moveOf({ plan, setMoving, change }: ShownAnswer): Corrections['move'] {
  return (at, letGo) => {
    const still = plan === null || msOf(at.startAt) === msOf(plan.band.startAt);
    setMoving(letGo && still ? null : at);
    if (letGo && !still) {
      change((input) => withStart(input, clockOf(at.startAt)), 'move');
    }
  };
}

// What the card's controls do to the conditions of the answer on screen when they are pressed or dragged: each change
// asks for a recalculation, but the ✕ of a meet's only Friend, which closes the answer with `close` and opens that
// Friend's card by the main screen's address. The list of Friends leaves out those `input` holds.
export function useCorrections(onScreen: ShownAnswer, input: PlanInput, close: () => void): Corrections {
  const { change, add, adding, setAdding } = onScreen;
  const showToast = useToast();
  const { choices, friendIds } = useChoices(input);
  const { focus, focusUntil } = useFocus();
  const only = onlyFriendOf(input);
  return {
    adding,
    toggleAdding: () => {
      setAdding(!adding);
    },
    choices,
    friendIds,
    choose: add,
    remove: (userId) => {
      if (only === null) {
        change((shown) => withoutPerson(shown, userId));
      } else {
        close();
        router.setParams({ person: only });
      }
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
    focus,
    focusUntil: () => {
      setAdding(false);
      focusUntil();
    },
    drop: (bound, time) => {
      change((shown) => withBound(shown, bound, time), 'drag');
    },
    move: moveOf(onScreen),
  };
}
