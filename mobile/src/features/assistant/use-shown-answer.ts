/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnswerReply, Cuisine, Plan, PlanInput } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import type { LocationMissing } from '@/api/refusal-types';
import type { LatLng } from '@/api/types';
import {
  type AnswerState,
  arrivedState,
  type ChangeBy,
  firstState,
  replaced,
  type SetStored,
  withPlan,
} from './answer-state';
import { type Frame, frameOf } from './answer-frame';
import { showing, withKind } from './meal-kinds';
import { useMenuOpening } from './use-menu-opening';
import { usePeoplePicking } from './use-people-picking';
import { withPerson } from './plan-input';
import type { Stretch } from './time-band';
import type { ChatBubble } from './use-chat';

export interface ShownAnswer {
  // The answer of the conversation's last reply, or null: the frame's card finds its bubble by it.
  source: AnswerReply | null;
  // The answer on screen: the source, or a recalculation that replaced it.
  answer: AnswerReply | null;
  // The Plan on screen: null for no answer and for an answer without a Plan.
  plan: Plan | null;
  index: number;
  // One Plan on or back, going round.
  browse: (step: 1 | -1) => void;
  // Shows a Plan; a candidate without the kind of food on screen clears the kind (P04 ticket 16).
  show: (planId: string) => void;
  // Chooses a kind of food on the phone, or clears it with null: the meal's `cuisine`, with no recalculation. A pick
  // without that kind gives way to the first candidate with it (`withKind`).
  chooseKind: (kind: Cuisine | null) => void;
  basisOpen: boolean;
  toggleBasis: () => void;
  // People are being picked in the time card (P04 ticket 64); `setAdding(false)` leaves without changing anything.
  adding: boolean;
  setAdding: (open: boolean) => void;
  // The answer is held as it is: a study answer together whose consent requests are out keeps its people, its time and
  // its room until they are taken back (P10 ticket 12). Picking does not open, and no change asks again.
  locked: boolean;
  lock: (locked: boolean) => void;
  // The people checked while picking, but the asker, null when not picking.
  picked: readonly string[] | null;
  // The rows' order while picking, kept from when it opened so that a check never moves a row; null until kept.
  pickOrder: readonly string[] | null;
  keepPickOrder: (order: readonly string[]) => void;
  // The people 완료 asked for, from the request until its answer or its failure, so that the card shows what was asked
  // in the meantime, not the answer before it (the user's phone, 2026-11-26).
  asked: readonly string[] | null;
  // Checks or unchecks a Friend while picking; outside it, opens picking with the Plan's people and that Friend.
  pick: (userId: string) => void;
  // 완료: asks once with everyone checked, nothing when that is the Plan's people, and ends picking.
  finishPicking: () => void;
  // A recalculation is on its way: one runs at a time.
  recalculating: boolean;
  // Asks for the answer to the conditions of the answer on screen when it is called, as `alter` changes them; it
  // replaces the one on screen. Without an answer on screen, or when `alter` gives the same conditions back, it does
  // nothing.
  change: (alter: (input: PlanInput) => PlanInput, by?: ChangeBy) => void;
  // Asks for the answer to the same conditions from where the User is now, as `change` does (P04 ticket 86).
  again: () => void;
  // Adds a Friend to the conditions as `change` does, chosen in the list or on the map, and holds them as the pending
  // add until the answer comes: the list of Friends stays open until then and closes with that answer.
  add: (userId: string) => void;
  // The Friend whose add is on its way, or null.
  pendingAdd: string | null;
  // "되돌리기" of an answer with no Plan that a drag brought, back to the answer before it; null otherwise. A drag that
  // brings a Plan is undone by dragging back (P04 ticket 86).
  undo: (() => void) | null;
  // The band's place while it is dragged whole, and after it is let go until the recalculation it asked for ends; the
  // input gives way to it.
  moving: Stretch | null;
  setMoving: (at: Stretch | null) => void;
  // What the time card is drawn from: the Plan on screen, or for an answer with no Plan the frame it was asked in
  // (P01 ticket 31); null with neither.
  frame: Frame | null;
  // The Plan whose restaurant's menu the raised card shows (board E4), null for the list of candidates (board E3).
  menuFor: string | null;
  // Shows that Plan and opens its restaurant's menu; `closeMenu` returns to the list.
  openMenu: (planId: string) => void;
  closeMenu: () => void;
}

// Where the User is, or why that is not known, which a recalculation sends, and what a failed one says.
export interface Recalculation {
  location: LatLng | null;
  // Left out as null.
  locationMissing?: LocationMissing;
  onFailed: () => void;
}

function sayNothing(): void {
  // A holder that asks for no recalculation hears of no failure.
}

const NO_RECALCULATION: Recalculation = { location: null, onFailed: sayNothing };

// A reply that only refuses to answer for a Friend, which the server never sends with an answer or a Lookup, keeps
// what is on screen, and the card puts its lines over the kept card's (board n8b).
export const keepsShown = ({ refusal }: ChatBubble): boolean => refusal?.kind === 'for-someone-else';

// A failure, the app's own bubble, and a reply that keeps what is on screen are no reply.
export function lastReply(bubbles: readonly ChatBubble[]): ChatBubble | undefined {
  return bubbles.findLast(
    (bubble) => bubble.role === 'assistant' && bubble.failure === null && bubble.own !== true && !keepsShown(bubble),
  );
}

function useBrowsing(setStored: SetStored): {
  browse: ShownAnswer['browse'];
  show: ShownAnswer['show'];
  toggleBasis: ShownAnswer['toggleBasis'];
  undo: () => void;
  setMoving: ShownAnswer['setMoving'];
} {
  const browse = useCallback(
    (step: 1 | -1): void => {
      setStored((last) => {
        const count = last.answer?.plans.length ?? 0;
        return count === 0 ? last : withPlan(last, (last.index + step + count) % count);
      });
    },
    [setStored],
  );
  const show = useCallback(
    (planId: string): void => {
      setStored((last) => {
        const index = last.answer?.plans.findIndex(({ id }) => id === planId) ?? -1;
        return index < 0 ? last : withPlan({ ...last, ...showing(last, index) }, index);
      });
    },
    [setStored],
  );
  const toggleBasis = useCallback((): void => {
    setStored((last) => ({ ...last, basisOpen: !last.basisOpen }));
  }, [setStored]);
  const undo = useCallback((): void => {
    setStored((last) =>
      last.kept === null || last.recalculating ? last : { ...last, ...last.kept, kept: null, basisOpen: false },
    );
  }, [setStored]);
  const setMoving = useCallback(
    (at: Stretch | null): void => {
      setStored((last) =>
        last.moving?.startAt === at?.startAt && last.moving?.endAt === at?.endAt ? last : { ...last, moving: at },
      );
    },
    [setStored],
  );
  return { browse, show, toggleBasis, undo, setMoving };
}

// The kind of food chosen on the phone (`withKind`): the answer on screen with its meal's `cuisine`, and its pick.
function useKindChoice(setStored: SetStored): ShownAnswer['chooseKind'] {
  return useCallback(
    (kind: Cuisine | null): void => {
      setStored((last) => {
        const next = withKind(last, kind);
        return next.answer === last.answer ? last : withPlan({ ...last, answer: next.answer }, next.index);
      });
    },
    [setStored],
  );
}

// A change of the conditions, and the Friend it adds, when it adds one.
type Ask = (
  alter: (input: PlanInput) => PlanInput,
  by: ChangeBy | undefined,
  adds: string | null,
  asked?: readonly string[],
) => void;

// Asks for a recalculation of the answer on screen when it is called, unless one of that epoch is on its way: a
// control may call a `change` of an earlier render. Its answer, or its failure, counts only while the epoch it was
// asked in is still the one on screen. A band let go where no recalculation is asked goes back.
// The answer held as it is (P10 ticket 12): while locked, picking does not open and no change asks again; a band let go
// goes back, as where no recalculation is asked.
function useLock(
  setAdding: (open: boolean) => void,
  ask: Ask,
): Pick<ShownAnswer, 'locked' | 'lock' | 'setAdding' | 'change'> {
  const [locked, lock] = useState(false);
  return {
    locked,
    lock,
    setAdding: (open) => {
      if (!(open && locked)) {
        setAdding(open);
      }
    },
    change: (alter, by) => {
      ask(locked ? (input: PlanInput): PlanInput => input : alter, by, null);
    },
  };
}

function useChange(current: AnswerState, setStored: SetStored, recalculation: Recalculation): Ask {
  const live = useRef({ current, recalculation });
  const flight = useRef<number | null>(null);
  useEffect(() => {
    live.current = { current, recalculation };
  });
  return (alter, by, adds, asked) => {
    const {
      current: { answer, epoch },
      recalculation: { location, locationMissing = null, onFailed },
    } = live.current;
    const input = answer === null ? null : alter(answer.input);
    if (input === null || input === answer?.input || flight.current === epoch) {
      setStored((last) => (last.moving === null ? last : { ...last, moving: null }));
      return;
    }
    flight.current = epoch;
    setStored((last) =>
      last.epoch === epoch ? { ...last, recalculating: true, pendingAdd: adds, asked: asked ?? null } : last,
    );
    const settle = (update: (last: AnswerState) => AnswerState): boolean => {
      if (flight.current === epoch) {
        flight.current = null;
      }
      const late = live.current.current.epoch !== epoch;
      setStored((last) => (late || last.epoch !== epoch ? last : update(last)));
      return !late;
    };
    apiClient.recalculateAnswer(input, location, locationMissing).then(
      (next) => {
        settle((last) => replaced(last, next, by));
      },
      () => {
        if (settle((last) => ({ ...last, recalculating: false, pendingAdd: null, asked: null, moving: null }))) {
          onFailed();
        }
      },
    );
  };
}

// The answer on screen and the Plan on screen, which the map and the card read. The conversation's last reply gives
// the source: a new one, told by its bubble since a reply may bring the same object again, shows its first Plan with
// the basis closed and drops anything a recalculation brought. A recalculation's answer replaces the one on screen,
// unless a new reply came while it was on its way.
export function useShownAnswer(
  bubbles: readonly ChatBubble[],
  recalculation: Recalculation = NO_RECALCULATION,
): ShownAnswer {
  const reply = lastReply(bubbles);
  const [stored, setStored] = useState<AnswerState>(() => firstState(reply, bubbles));
  const current = stored.replyId === (reply?.id ?? null) ? stored : arrivedState(reply, stored, bubbles);
  if (current !== stored) {
    setStored(current);
  }
  const ask = useChange(current, setStored, recalculation);
  const browsing = useBrowsing(setStored);
  const chooseKind = useKindChoice(setStored);
  const menu = useMenuOpening(setStored, browsing.show);
  const picking = usePeoplePicking(setStored, current.picked, (alter, asked) => {
    ask(alter, undefined, null, asked);
  });
  const held = useLock(picking.setAdding, ask);
  const plan = current.answer?.plans[current.index] ?? null;
  return {
    source: current.source,
    answer: current.answer,
    plan,
    frame: plan ?? frameOf(current.answer, current.framed),
    index: current.index,
    ...browsing,
    chooseKind,
    basisOpen: current.basisOpen,
    adding: current.adding,
    recalculating: current.recalculating,

    again: () => {
      // A copy, which `ask` takes for a change.
      ask((input) => ({ ...input }), undefined, null);
    },
    add: (userId) => {
      ask((input) => withPerson(input, userId), undefined, userId);
    },
    picked: current.picked,
    pickOrder: current.pickOrder,
    asked: current.asked,
    ...picking,
    ...held,
    pendingAdd: current.pendingAdd,
    undo: current.kept === null ? null : browsing.undo,
    moving: current.moving,
    menuFor: current.menu && plan !== null ? plan.id : null,
    ...menu,
  };
}
