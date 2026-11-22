/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import { now } from '@/clock';
import { koreaInstant } from '@/korea-time';

// A 파티 already made, changed in place (P04 ticket 25): "방금 만든 파티 19시로" answers with today's dinner moved to
// 19:00, which tells the 2 who joined; "방금 만든 파티 제목 바꿔 줘" answers 파티 수정하기, a change made in the room.
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
  const startsAt = koreaInstant(now(), 0, 19, 0).toISOString();
  return {
    text: '19:00으로 바꿀까요? 바꾸면 참여한 2명에게 알림이 가요.',
    mapButtons: [],
    cards: [],
    proposal: {
      title: '저녁 같이 먹어요',
      description: '학생회관에서 저녁 같이 먹어요',
      joinPolicy: 'approval',
      board: 'meal',
      capacity: 4,
      startsAt,
      place: null,
      globalEvent: null,
      invitees: [],
      change: {
        questId: 'mock-quest-party',
        subQuestId: 'mock-step-party',
        step: { title: '저녁 같이 먹어요', startsAt },
        told: 2,
      },
    },
  };
}
