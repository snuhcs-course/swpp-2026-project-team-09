/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';

// A Quest the User already holds that an answer stands beside (P04 ticket 17): what it is, when and where, with whom,
// whether others share it, and whether this answer may change it. One shape for every planner's answer; a meal
// answer's `mealSet` is its first source.
export interface SetQuest {
  questId: string;
  title: string;
  // Korea time with the offset.
  startAt: string;
  place: string;
  // The others' names.
  people: string[];
  // Another holds it or is invited: it is changed in its 파티, not here.
  shared: boolean;
  // 바꾸기 makes the answer's Plan in its place.
  changeable: boolean;
}

// The Quest the answer stands beside, or null for none.
export function setQuestOf(answer: AnswerReply | null): SetQuest | null {
  const set = answer?.mealSet ?? null;
  if (set === null) {
    return null;
  }
  const { questId, title, startAt, place, friendNames, shared } = set;
  return { questId, title, startAt, place, people: friendNames, shared, changeable: !shared };
}
