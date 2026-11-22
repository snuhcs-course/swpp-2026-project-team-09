/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { friendIdOf } from '@/features/map/adapter';

const PICK_ID = 'answer:pick';
const ME_ID = 'answer:me';
const PERSON_ID = 'answer:person:';

// A mark whose card opens at a press, with its position.
export type OnMark = (id: string, position: LatLng, pick?: LatLng | null) => void;

export function takesNoPress(): boolean {
  return false;
}

export function ignoreMark(): void {
  // Without a card to open, a mark takes no press.
}

function isPick(id: string): boolean {
  return id === PICK_ID;
}

// The pick, the User's start, and the faces of the Plan's people open their cards.
function opensCard(id: string): boolean {
  return id === PICK_ID || id === ME_ID || id.startsWith(PERSON_ID);
}

// The marks of a Plan that take a press although they are no Plan's: those that open a card, the pick alone once the
// Plan is sent.
export function pressableWhile(sent: boolean): (id: string) => boolean {
  return sent ? isPick : opensCard;
}

// A press on the Avatar of a Friend whom the conditions do not hold adds the Friend.
function addOnPress(add: ShownAnswer['add'], id: string): void {
  const userId = friendIdOf(id);
  if (userId !== null) {
    add(userId);
  }
}

// A press on the map while a Plan is drawn: the pick opens its card, before the Plan is sent or after; before, the
// User's start and a face of the Plan's people open theirs, a candidate shows its Plan unless a recalculation is on its
// way, and a Friend's Avatar adds them.
export function planPress(
  drawing: AnswerDrawing,
  { add, show, recalculating }: Pick<ShownAnswer, 'add' | 'show' | 'recalculating'>,
  sent: boolean,
  onMark: OnMark,
): (id: string) => void {
  return (id) => {
    const thing = drawing.things.find((one) => one.id === id);
    if (thing !== undefined && pressableWhile(sent)(id)) {
      onMark(id, thing.position, drawing.pick);
      return;
    }
    if (sent) {
      return;
    }
    const planId = thing?.planId ?? null;
    if (planId !== null && recalculating) {
      return;
    }
    if (planId === null) {
      addOnPress(add, id);
    } else {
      show(planId);
    }
  };
}
