/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ChatBubble } from '@/features/assistant/use-chat';
import { setQuestOf } from '@/features/assistant/set-quest';
import { leaveOfferOf, leaveWordsOf } from '@/features/assistant/use-quest-leaving';
import { keepsShown } from '@/features/assistant/use-shown-answer';
import type { ChatSheetControl } from '../chat-sheet';
import { planCardRests } from './plan-card';
import { onScreenOf, planShown, wordsKindOf } from './reply-words';
import { lookupRestOf, setQuestRestOf, type WordsRest, wordsRestOf } from './words-rest';

// What the turn on screen says in brief (moved out of the dock, which P04 ticket 61 took away): its one line and its
// buttons, which the keyboard's view shows over the input and whose pickers the open card shows under the reply.

// The turn on screen in brief: its Plan's card with nothing to read (board 10), a reply's one line and buttons
// (`WordsRest`), or null.
export type Rest = { kind: 'plan' } | { kind: 'words'; words: WordsRest };

// A reply that holds nothing but its words: no card, map button, Proposal, steps, or booking, and not the app's own.
function bare(reply: ChatBubble): boolean {
  const { cards, mapButtons, proposal, steps, done, own = false } = reply;
  return (
    cards.length === 0 &&
    mapButtons.length === 0 &&
    proposal === null &&
    steps === undefined &&
    done === undefined &&
    !own
  );
}

// The Plan's card alone with nothing to read.
function planRests(control: ChatSheetControl, reply: ChatBubble): boolean {
  const { answer: shown, chat } = control;
  const refusal = keepsShown(reply) ? (reply.refusal?.lines ?? []) : [];
  return (
    planShown(chat.bubbles, onScreenOf(control)) && shown.answer !== null && planCardRests(shown, shown.answer, refusal)
  );
}

// A Plan beside a Quest the User holds, at rest: its line says so (P04 ticket 17).
function besideSetQuest(control: ChatSheetControl): boolean {
  const { answer: shown, chat } = control;
  const { plan, adding, moving, ghost } = shown;
  return (
    setQuestOf(shown.answer) !== null &&
    plan !== null &&
    !adding &&
    moving === null &&
    ghost === null &&
    planShown(chat.bubbles, onScreenOf(control))
  );
}

// The bottom hides only what the map already says: a reply with cards, with several parts, or with nothing to draw
// keeps the open card, and so does a Plan's card with something to read. A Plan beside a Quest the User holds docks
// with its line, and a Proposal on the map docks.
export function restOf(control: ChatSheetControl, after: readonly ChatBubble[]): Rest | null {
  const [reply] = after;
  // A Proposal drawn on the map docks with nothing to read: its flag says what and when (P04 ticket 06).
  if (reply !== undefined && control.proposal?.bubbleId === reply.id) {
    return { kind: 'words', words: { line: null, offers: [], retry: false, note: null } };
  }
  if (after.length !== 1 || reply === undefined || !bare(reply)) {
    return null;
  }
  const kind = wordsKindOf(reply, onScreenOf(control));
  if (kind === 'plan') {
    if (besideSetQuest(control)) {
      const { changed, refused, left } = control.invitation;
      const leftAlone = changed === null && refused === null && left !== null;
      return { kind: 'words', words: setQuestRestOf(reply.text, changed ?? refused ?? left, leftAlone) };
    }
    return planRests(control, reply) ? { kind } : null;
  }
  const { lookup } = control.lookup;
  let words: WordsRest | null = null;
  if (kind === 'lookup' && lookup !== null) {
    words = lookupRestOf(lookup, reply.refusal ?? null, reply.text);
  } else if (kind === 'own') {
    const leave = leaveOfferOf(reply);
    words = wordsRestOf(
      reply,
      leave === null ? null : leaveWordsOf(leave, control.leave.stateOf(reply.id, leave.questId)),
    );
  }
  return words === null ? null : { kind: 'words', words };
}
