/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, PlanInput } from '@/api/assistant-types';
import { EVENTS_ANSWER } from './data/events-answer';
import { NEW_QUEST_ANSWER } from './data/new-quest-answer';
import { QUESTS_ANSWER } from './data/quests-answer';

// The mock's events and recruiting parties answered on the map (P02 ticket 30), from the stored copies of the main
// server's real answers: row 4's events and row 5's badminton parties and new party. It does not calculate.

function replyWith(text: string, answer: AnswerReply): AssistantReply {
  return { text, mapButtons: [], cards: [], proposal: null, answer };
}

// By the words of boards Alone 1, Recruit 4, and Join 1, the first found first.
const REPLIES: [string, AssistantReply][] = [
  ['새로 모집', replyWith('17:10 체육관에서 서준과 모여요.', NEW_QUEST_ANSWER)],
  ['볼 만한', replyWith('채용박람회에 13:54에 도착해서 78분 볼 수 있어요.', EVENTS_ANSWER)],
  ['칠 사람', replyWith('18:00 체육관 파티에 17:43에 나서면 돼요.', QUESTS_ANSWER)],
];

export function rowFourReplyOf(words: string): AssistantReply | null {
  return REPLIES.find(([said]) => words.includes(said))?.[1] ?? null;
}

const COPIES: Partial<Record<PlanInput['kind'], AnswerReply>> = {
  events: EVENTS_ANSWER,
  quests: QUESTS_ANSWER,
  'new-quest': NEW_QUEST_ANSWER,
};

// The copy of a recalculation's kind, or null for a meal's and a meet's.
export function rowFourCopyOf(input: PlanInput): AnswerReply | null {
  return COPIES[input.kind] ?? null;
}
