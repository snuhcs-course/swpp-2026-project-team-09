/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, PlanInput } from '@/api/assistant-types';

type Kind = PlanInput['kind'];

// The card's first line while the list of Friends is open: who comes to eat, to meet, or is invited to a new party.
// Events and parties take nobody, so they have no list.
const WHO: Record<Kind, string> = {
  meal: '누구와 같이 먹을까요?',
  meet: '누구와 같이 만날까요?',
  'new-quest': '누구를 초대할까요?',
  events: '누구와 같이 갈까요?',
  quests: '누구와 같이 갈까요?',
};

// The name "＋ 같이" is read by, or null where it is left out.
const ADD: Record<Kind, string | null> = {
  meal: '같이 먹을 친구 추가',
  meet: '같이 만날 친구 추가',
  'new-quest': '초대할 친구 추가',
  events: null,
  quests: null,
};

export function whoOf(kind: Kind): AnswerLine {
  return [{ text: WHO[kind], strong: false }];
}

export function addNameOf(kind: Kind): string | null {
  return ADD[kind];
}
