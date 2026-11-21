/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine } from '@/api/assistant-types';
import type { Lookup, LookupAction } from '@/api/lookup-types';
import type { Refusal } from '@/api/refusal-types';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { modelWordsOf } from '@/features/assistant/model-words';
import { mainActionOf } from '@/features/assistant/use-shown-lookup';
import { wordsLine } from './keyboard-headline';
import { type ButtonOffer, isButton } from './refusal-reply';

// How a reply that is no Plan rests in the dock (P04 ticket 05): the one line, null when the map says it all, which a
// press opens to the whole reply; the chips that do what its card's buttons did; 다시 시도; the note; `basis`, a
// Lookup with no line whose basis the map does not show, which 근거 › opens in the raised card; and `keep`, a Plan
// beside a Quest the User holds (ticket 17), whose 그대로 두기 leaves the Quest as it is (ticket 20).
export interface WordsRest {
  line: AnswerLine | null;
  offers: readonly ButtonOffer[];
  retry: boolean;
  note: string | null;
  basis: boolean;
  keep?: boolean;
}

// A Plan beside a Quest the User holds: the model's line, which says so, with 그대로 두기; once the User chose (바꾸기
// changed the meeting in place or was refused for good, or 그대로 두기 left the Quest as it is), the line that says so
// (`chosen`), alone.
export function setQuestRestOf(words: string, chosen: string | null = null): WordsRest {
  const line = wordsLine(chosen ?? words);
  return { line, offers: [], retry: false, note: null, basis: false, keep: chosen === null };
}

type AskAction = Extract<LookupAction, { kind: 'ask' }>;

// Every Lookup docks but a day's without the model's words, whose list is read in the card; one beside a refusal, or
// with words that say why it is shown (P04 ticket 18), always does.
export function lookupDocks({ kind }: Lookup, refusal: Refusal | null, words = ''): boolean {
  return refusal !== null || kind !== 'day' || spoken(words);
}

// Whether the model said something beside the Lookup.
function spoken(words: string): boolean {
  return said(wordsLine(modelWordsOf(words))).trim() !== '';
}

function said(line: AnswerLine): string {
  return line.map(({ text }) => text).join('');
}

// The line of a Lookup in the dock: beside a refusal, the refusal's first line; else the model's words, which say why
// the Lookup is shown and are never dropped (P04 ticket 18); else, when the model said nothing, the Lookup's headline,
// words the map does not show (the shuttle not running, a menu, a study area's state, where a Friend is), but none for a
// way or a place with a way to take, whose flag and route say its name and minutes. Without a line, a Lookup with a
// basis has 근거 ›, until its flag raises the card. Null for the open card.
export function lookupRestOf(lookup: Lookup, refusal: Refusal | null, words: string): WordsRest | null {
  if (!lookupDocks(lookup, refusal, words)) {
    return null;
  }
  const way = lookup.kind === 'way' || lookup.kind === 'place';
  const drawn = refusal === null && way && mainActionOf(lookup)?.kind === 'guide';
  const asks = refusal === null ? lookup.actions.filter((action): action is AskAction => action.kind === 'ask') : [];
  const headline = drawn ? null : (lookup.lines[0] ?? null);
  const line = refusal?.lines[0] ?? (spoken(words) ? wordsLine(words) : headline);
  return {
    line,
    offers: asks,
    retry: false,
    note: lookup.note ?? null,
    basis: line === null && lookup.basis.length > 0,
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
