/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { PickFriendOffer, Refusal } from '@/api/refusal-types';

// The question the main server asks when the User's words fit several Friends (P02 ticket 17), in the shape agreed
// with package A: its two lines, and one offer per candidate with the full name as the label and the words, and the
// department aside. No real reply of it exists yet.

export function pick(userId: string, name: string, department: string | null): PickFriendOffer {
  return { kind: 'pick-friend', userId, label: name, aside: department, text: name };
}

export function whichFriend(asked: string, offers: readonly PickFriendOffer[]): Refusal {
  return {
    kind: 'which-friend',
    lines: [[{ text: `${asked}가 두 명이에요.`, strong: false }], [{ text: '누구인가요?', strong: false }]],
    offers: [...offers],
  };
}

export const KIM_MINSU = pick('minsu-kim', '김민수', '컴퓨터공학부');
export const LEE_MINSU = pick('minsu-lee', '이민수', '경영학과');

export const WHICH_MINSU = whichFriend('민수', [KIM_MINSU, LEE_MINSU]);

export const WHICH_MINSU_REPLY: AssistantReply = {
  text: '민수가 두 명이에요.\n누구인가요?',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: WHICH_MINSU,
};
