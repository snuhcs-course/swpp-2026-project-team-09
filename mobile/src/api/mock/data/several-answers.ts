/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, LibraryCard } from '@/api/assistant-types';
import { field, listOf } from '@/api/server/answers';
import { isLibraryCardData, withLibraryDefaults } from '@/api/server/library-card-answers';
import { isAnswerReply } from '@/api/server/plan-answers';
import { isReplyStep } from '@/api/server/step-answers';
import lunchDinner from './several-answers-lunch-dinner.json';
import seatDinner from './several-answers-seat-dinner.json';
import studyLunch from './several-answers-study-lunch.json';
import { isStepsAsk, stepsReplyOn } from './steps-answer';

// The main server's replies to messages that asked for several things, to an app that says `answers` (P03 ticket 21):
// one answer per request, each with its key, and the steps naming them by key. Taken whole from the main server's
// integration stage (P05 ticket 74's `assistant-steps-chain` and ticket 76's `assistant-study-then-meal`) with the
// scripted model, the seed's Places and walks, on its Tuesday 2088-03-09, and moved to `date`:
// - "점심이랑 저녁 짜줘" at 09:00: lunch, then dinner from lunch's Restaurant;
// - "5시 반부터 관정 7층에 있다가 저녁 먹을래": the seat's book card from 17:30 to 19:00, then dinner from 62-1동;
// - "아침 7시에 도서관 갔다가 점심" at 01:20 far from campus: a study place from 07:00, then lunch from it.
const STORED_DATE = '2088-03-09';

function replyOf(stored: unknown, date: string): AssistantReply {
  const moved: unknown = JSON.parse(JSON.stringify(stored).replaceAll(STORED_DATE, date));
  const text = field(moved, 'text');
  const answer = field(moved, 'answer');
  const answers = field(moved, 'answers');
  const steps = field(moved, 'steps');
  const cards = field(moved, 'cards');
  const data = Array.isArray(cards) ? cards.map((card: unknown) => field(card, 'library')) : null;
  if (
    typeof text !== 'string' ||
    !(answer === null || isAnswerReply(answer)) ||
    !listOf(isAnswerReply)(answers) ||
    !listOf(isReplyStep)(steps) ||
    !listOf(isLibraryCardData)(data)
  ) {
    throw new Error('A stored reply of several answers fails the check of a reply');
  }
  const library = data.map((card): LibraryCard => ({ kind: 'library', library: withLibraryDefaults(card) }));
  return { text, mapButtons: [], cards: library, proposal: null, answer, answers, lookup: null, refusal: null, steps };
}

// The reply of several answers to these words, the reply of before to "관정 갔다가 저녁" (`steps-answer.ts`), or null for
// words of no such message.
export function severalAnswersReplyTo(words: string, date: string): AssistantReply | null {
  if (words.includes('도서관') && words.includes('갔다가') && words.includes('점심')) {
    return replyOf(studyLunch, date);
  }
  if (words.includes('점심') && words.includes('저녁') && !words.includes('관정')) {
    return replyOf(lunchDinner, date);
  }
  if (words.includes('관정') && words.includes('있다가') && words.includes('저녁')) {
    return replyOf(seatDinner, date);
  }
  return isStepsAsk(words) ? stepsReplyOn(date) : null;
}
