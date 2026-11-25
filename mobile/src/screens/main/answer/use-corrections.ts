/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ConditionChip, PlanInput } from '@/api/assistant-types';
import type { RelaxOffer } from '@/api/relax-types';
import type { LatLng } from '@/api/types';
import { useToast } from '@/design-system';
import { useFriends } from '@/features/friends/use-friends';
import { onlyFriendOf } from '@/features/assistant/meet-input';
import { peopleOf, withBound, withOrigin, withoutPerson, withStart } from '@/features/assistant/plan-input';
import { backToNow, relaxed, timeChipChange } from '@/features/assistant/relaxed-plan';
import { type BandBound, clockOf, msOf, type Stretch } from '@/features/assistant/time-band';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { waitForPlace } from '@/features/places/picked-place';

// A Friend not in the conditions, who could be picked.
interface Choice {
  id: string;
  name: string;
  department: string;
  position: LatLng | null;
  minutesOld: number | null;
}

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
  focusUntil: (chip: ConditionChip) => void;
  drop: (bound: BandBound, time: string) => void;
  // A button of an answer that nothing fits 지금, and 처음으로 back to 지금.
  relax: (offer: RelaxOffer) => void;
  back: () => void;
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
// The handle the time bar draws emphasised for a while after a time chip was pressed. The chips and the bar each hold
// their own corrections, so the frame holds this one for both.
export interface BandFocus {
  focus: BandBound | null;
  focusUntil: () => void;
}

export function useBandFocus(): BandFocus {
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

// A person's ✕: a recalculation without them, but for a meet's only Friend, `close` and that Friend's card by the main
// screen's address.
function removerOf(change: ShownAnswer['change'], only: string | null, close: () => void): (userId: string) => void {
  return (userId) => {
    if (only === null) {
      change((conditions) => withoutPerson(conditions, userId));
    } else {
      close();
      router.setParams({ person: only });
    }
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
// asks for a recalculation, but a person's ✕ as `removerOf` says. The list of Friends leaves out those `input` holds.
export function useCorrections(
  shown: ShownAnswer,
  input: PlanInput,
  close: () => void,
  { focus, focusUntil }: BandFocus,
): Corrections {
  const { change, add, adding, setAdding } = shown;
  const showToast = useToast();
  const { choices, friendIds } = useChoices(input);
  return {
    adding,
    toggleAdding: () => {
      setAdding(!adding);
    },
    choices,
    friendIds,
    choose: add,
    remove: removerOf(change, onlyFriendOf(input), close),
    chooseOrigin: () => {
      waitForPlace(({ placeId }) => {
        if (placeId === null) {
          showToast('건물을 골라 주세요');
        } else {
          change((conditions) => withOrigin(conditions, placeId));
        }
      });
      router.push('/place-map');
    },
    focus,
    focusUntil: (chip) => {
      const eased = timeChipChange(chip, shown.answer);
      if (eased !== null) {
        change(eased);
        return;
      }
      setAdding(false);
      focusUntil();
    },
    drop: (bound, time) => {
      change((conditions) => withBound(conditions, bound, time), 'drag');
    },
    relax: (offer) => {
      change((conditions) => relaxed(conditions, offer));
    },
    back: () => {
      change(backToNow);
    },
    move: moveOf(shown),
  };
}
