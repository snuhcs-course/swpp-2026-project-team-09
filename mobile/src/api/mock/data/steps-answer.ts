/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, LibraryCard } from '@/api/assistant-types';
import { field, listOf } from '@/api/server/answers';
import { isLibraryCardData, withLibraryDefaults } from '@/api/server/library-card-answers';
import { isAnswerReply } from '@/api/server/plan-answers';
import { isReplyStep } from '@/api/server/step-answers';
import stored from './steps-answer.json';

// The main server's reply to "17시 반에 관정 갔다가 19시쯤 저녁 먹으려고 하는데 7층 자리 예약하고 스케줄 짜줘" (P03),
// from its evaluation run in the P4 world on Monday 2026-11-02 at 13:00, copied whole: the seat's book card from 17:30
// to 19:00, dinner at 학생회관식당 from 62-1동 at 19:04, and the two steps. It is moved to `date`, so that the card is
// for today.
const STORED_DATE = '2026-11-02';

export function stepsReplyOn(date: string): AssistantReply {
  const moved: unknown = JSON.parse(JSON.stringify(stored).replaceAll(STORED_DATE, date));
  const text = field(moved, 'text');
  const answer = field(moved, 'answer');
  const steps = field(moved, 'steps');
  const cards = field(moved, 'cards');
  const data = Array.isArray(cards) ? cards.map((card: unknown) => field(card, 'library')) : null;
  if (typeof text !== 'string' || !isAnswerReply(answer) || !listOf(isReplyStep)(steps)) {
    throw new Error('The stored reply of two steps fails the check of a reply');
  }
  if (!listOf(isLibraryCardData)(data)) {
    throw new Error('The stored reply of two steps holds a card the app does not know');
  }
  const library = data.map((card): LibraryCard => ({ kind: 'library', library: withLibraryDefaults(card) }));
  return { text, mapButtons: [], cards: library, proposal: null, answer, lookup: null, refusal: null, steps };
}

// Words that ask for a step and then a meal, such as "관정 갔다가 저녁".
export const isStepsAsk = (words: string): boolean =>
  words.includes('갔다가') && (words.includes('저녁') || words.includes('점심'));
