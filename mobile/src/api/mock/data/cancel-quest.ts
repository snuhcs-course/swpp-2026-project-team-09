/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import { now } from '@/clock';
import { koreaInstant } from '@/korea-time';

// A Quest cancelled by words (P04 ticket 24): "저녁 약속 취소해 줘" answers 취소하기 for a dinner the User holds alone,
// and "점심 파티 나갈래" 나가기 for tomorrow's lunch with 민수, who keeps it.
export function cancelReplyTo(asked: string): AssistantReply | null {
  const at = now();
  if (asked.includes('약속') && asked.includes('취소')) {
    return {
      text: '오늘 18:00 저녁 약속을 취소할까요?',
      mapButtons: [],
      cards: [],
      proposal: null,
      offers: [
        {
          kind: 'leave-quest',
          label: '취소하기',
          title: '저녁 약속',
          startsAt: koreaInstant(at, 0, 18, 0).toISOString(),
          questId: 'mock-quest-dinner',
        },
      ],
    };
  }
  if (asked.includes('파티') && asked.includes('나갈')) {
    return {
      text: '내일 12:30 민수와의 점심에서 나갈까요? 민수는 그대로 가요.',
      mapButtons: [],
      cards: [],
      proposal: null,
      offers: [
        {
          kind: 'leave-quest',
          label: '나가기',
          title: '민수와 점심',
          startsAt: koreaInstant(at, 1, 12, 30).toISOString(),
          questId: 'mock-quest-lunch',
        },
      ],
    };
  }
  return null;
}
