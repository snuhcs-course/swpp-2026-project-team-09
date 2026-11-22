/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import { now } from '@/clock';
import { koreaDateKey, koreaNextDay } from '@/korea-time';

function words(text: string, offers: AssistantReply['offers'] = []): AssistantReply {
  return { text, mapButtons: [], cards: [], proposal: null, offers };
}

// A Place or a time asked back (P04 ticket 26): "모임 장소 정해줘" asks where with 지도에서 고르기, "모임 시간 정해줘"
// asks when tomorrow with 시간 고르기 and the User's Free Time around a 10:00–11:15 Class; what they send is taken.
export function pickReplyTo(asked: string): AssistantReply | null {
  if (asked.includes('모임 장소')) {
    return words('어디서 만날까요?', [{ kind: 'pick-place', label: '지도에서 고르기', text: '여기서' }]);
  }
  if (asked.includes('모임 시간')) {
    const date = koreaDateKey(koreaNextDay(now()));
    const free = [
      { from: '09:00', until: '10:00' },
      { from: '11:15', until: '24:00' },
    ];
    return words('내일 몇 시에 만날까요?', [{ kind: 'pick-time', label: '시간 고르기', date, free }]);
  }
  if (asked === '여기서') {
    return words('좋아요, 고른 건물에서 만나요.');
  }
  return /^\d\d:\d\d에$/u.test(asked) ? words(`좋아요, ${asked} 만나요.`) : null;
}
