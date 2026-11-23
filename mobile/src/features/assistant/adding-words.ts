/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { objectParticle } from '@/features/map/short-name';
import { koreaClock } from '@/korea-time';

type Adding = NonNullable<AnswerReply['adding']>;

// Whom the press invites: one Friend with "이" after a final consonant ("지은이", "하나"), several by name ("지은, 하은").
function whom({ friends }: Adding): string {
  const [one, ...rest] = friends;
  if (one === undefined) {
    return '';
  }
  if (rest.length > 0) {
    return friends.map(({ name }) => name).join(', ');
  }
  return objectParticle(one.name) === '을' ? `${one.name}이` : one.name;
}

// The main button's words when the plans add Friends to the meal the User holds (P05 ticket 44): what the press does,
// "지은이 초대 보내기", or "12:58로 옮기고 지은이 초대 보내기" when the start moves too.
export function addingWordsOf(adding: Adding): string {
  const invite = `${whom(adding)} 초대 보내기`;
  return adding.movesTo === null ? invite : `${koreaClock(adding.movesTo)}로 옮기고 ${invite}`;
}

// The answer's line once that press changed the meal held (P05 ticket 44): what it did, "지은에게 초대를 보냈어요", or
// "점심을 12:58로 옮기고 지은에게 초대를 보냈어요" when the start moved. `word` is the meal's ("점심"), which ends in a
// final consonant and so takes 을.
export function addedLineOf(adding: Adding, word = '약속'): string {
  const names = adding.friends.map(({ name }) => name).join(', ');
  const sent = `${names}에게 초대를 보냈어요`;
  return adding.movesTo === null ? sent : `${word}을 ${koreaClock(adding.movesTo)}로 옮기고 ${sent}`;
}
