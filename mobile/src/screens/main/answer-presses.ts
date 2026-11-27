/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { drawsMeal } from '@/features/assistant/meal-marks';
import { friendIdOf } from '@/features/map/adapter';
import { openMealMenu } from './answer/meal-card';
import type { ChatSheetControl } from './chat-sheet';

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

// A press on a Friend's Avatar checks or unchecks their row in the time card, and opens picking first when it is not
// open, with them checked (P04 ticket 64).
function pickOnPress(pick: ShownAnswer['pick'], id: string): void {
  const userId = friendIdOf(id);
  if (userId !== null) {
    pick(userId);
  }
}

// A press on the map while a Plan is drawn: the pick opens its card, before the Plan is sent or after; before, the
// User's start and a face of the Plan's people open theirs, a candidate shows its Plan unless a recalculation is on its
// way, and a Friend's Avatar is picked.
export function planPress(
  drawing: AnswerDrawing,
  { pick, show, recalculating }: Pick<ShownAnswer, 'pick' | 'show' | 'recalculating'>,
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
      pickOnPress(pick, id);
    } else {
      show(planId);
    }
  };
}

// "메뉴 ›": a press on a meal answer's chosen place, its label included, raises the card to that restaurant's menu
// (board E4), and a study answer's to that place's spaces (P10 ticket 19); any other mark opens as before.
export function withMealMenu(control: Pick<ChatSheetControl, 'answer' | 'card'>, onMark: OnMark): OnMark {
  return (id, position, pick) => {
    const { answer, plan } = control.answer;
    if (id === 'answer:pick' && answer !== null && plan !== null && drawsMeal(answer)) {
      openMealMenu(control, plan.id);
      return;
    }
    onMark(id, position, pick);
  };
}
