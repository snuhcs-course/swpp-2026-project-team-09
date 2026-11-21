/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine } from '@/api/assistant-types';
import type { Lookup, LookupAction } from '@/api/lookup-types';
import type { Refusal } from '@/api/refusal-types';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { mainActionOf } from '@/features/assistant/use-shown-lookup';
import { wordsLine } from './keyboard-headline';
import { type ButtonOffer, isButton } from './refusal-reply';

// How a reply that is no Plan rests in the dock (P04 ticket 05): the one line, null when the map says it all, which a
// press opens to the whole reply; the chips that do what its card's buttons did; 다시 시도; the note; and `basis`, a
// Lookup with no line whose basis the map does not show, which 근거 › opens in the raised card.
export interface WordsRest {
  line: AnswerLine | null;
  offers: readonly ButtonOffer[];
  retry: boolean;
  note: string | null;
  basis: boolean;
}

type AskAction = Extract<LookupAction, { kind: 'ask' }>;

// Every Lookup docks but a day's, whose list is read in the card; one beside a refusal always does.
export function lookupDocks({ kind }: Lookup, refusal: Refusal | null): boolean {
  return refusal !== null || kind !== 'day';
}

// A way or a place with a way to take says its name and minutes on the flag and the route, so its dock has no line.
// Any other Lookup's headline is words the map does not show (the shuttle not running, a menu, a study area's state,
// where a Friend is, the User already there), and so is a refusal's beside it. Null for the open card.
export function lookupRestOf(lookup: Lookup, refusal: Refusal | null, words: string): WordsRest | null {
  if (!lookupDocks(lookup, refusal)) {
    return null;
  }
  const way = lookup.kind === 'way' || lookup.kind === 'place';
  const drawn = refusal === null && way && mainActionOf(lookup)?.kind === 'guide';
  const asks = refusal === null ? lookup.actions.filter((action): action is AskAction => action.kind === 'ask') : [];
  return {
    line: drawn ? null : ((refusal?.lines ?? lookup.lines)[0] ?? wordsLine(words)),
    offers: asks,
    retry: false,
    note: lookup.note ?? null,
    basis: drawn && lookup.basis.length > 0,
  };
}

// Words that ask the User back, such as the next meal offered once today's is over: the text ends with a question.
// Words that answer and carry an offer (a Tutorial quest's facts with 가는 길 보기) are a procedure, read whole.
function asksBack(words: string): boolean {
  return /[?？]\s*$/u.test(words);
}

// A refusal, a failure, or a question back (words that ask, with offers): the first line, with the buttons as chips. A
// refusal that asks which Friend keeps its grid in the open card, and any other words their card, with their offers
// under them (decision 3). Null for the open card.
export function wordsRestOf({ refusal = null, failure, offers = [], text }: ChatBubble): WordsRest | null {
  const rest = { retry: false, note: null, basis: false };
  if (refusal !== null) {
    return refusal.offers.every(isButton)
      ? { ...rest, line: refusal.lines[0] ?? wordsLine(text), offers: refusal.offers.filter(isButton) }
      : null;
  }
  if (failure !== null) {
    return { ...rest, line: wordsLine(text), offers: [], retry: failure === 'unavailable' };
  }
  return offers.length > 0 && asksBack(text) ? { ...rest, line: wordsLine(text), offers } : null;
}
