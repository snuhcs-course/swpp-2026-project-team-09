/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import { frameTime } from './frame';

// A 파티 already made, changed in place (P04 ticket 25): "방금 만든 파티 19시로" answers with the 저녁 약속 moved to
// 19:00, which tells the 1 who joined; "방금 만든 파티 제목 바꿔 줘" answers 파티 수정하기, a change made in the room.
export function partyChangeReplyTo(asked: string): AssistantReply | null {
  if (!asked.includes('방금 만든 파티')) {
    return null;
  }
  if (asked.includes('제목')) {
    return {
      text: '제목은 파티에서 바꿀 수 있어요.',
      mapButtons: [],
      cards: [],
      proposal: null,
      offers: [{ kind: 'quest', label: '파티 수정하기', questId: 'mock-quest-party' }],
    };
  }
  // The mock's own 저녁 약속 (`quests.ts`, 20:10 at 학생회관), led by the User with 김민준 in it, moved to 19:00.
  const startsAt = frameTime('19:00');
  const place = { label: '학생회관 (63동)', latitude: 37.45907, longitude: 126.95023 };
  return {
    text: '19:00으로 바꿀까요? 바꾸면 참여한 1명에게 알림이 가요.',
    mapButtons: [],
    cards: [],
    proposal: {
      title: '저녁 약속',
      description: '',
      joinPolicy: 'closed',
      board: null,
      capacity: 4,
      startsAt,
      place: { id: 'mock-place-63', name: '학생회관 (63동)' },
      globalEvent: null,
      invitees: [],
      change: { questId: 'q-dinner', subQuestId: 'q-dinner-1', step: { title: '저녁 약속', startsAt, place }, told: 1 },
    },
  };
}
