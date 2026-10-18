/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { AssistantReply, ChatMessage } from '@/api/assistant-types';
import { now } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import { MENUS } from './data/menus';

// The Assistant without a model: a question about the menus is answered from the mocks' menus of the day, one about
// the shuttle with its layer's button, and anything else with a short reply, so that the chat can be seen and tried
// where the app asks no main server.

const MENU_WORDS = ['메뉴', '학식', '점심', '저녁', '아침', '밥'];
const SHUTTLE_WORDS = ['셔틀', '버스'];

function menusReply(): string {
  const restaurants = (MENUS[koreaDateKey(now())] ?? []).filter(({ meals }) => meals.length > 0);
  if (restaurants.length === 0) {
    return '오늘은 수집된 메뉴가 없어요.';
  }
  const lines = restaurants.slice(0, 3).map(({ name, meals }) => {
    const dishes = meals
      .flatMap(({ lines: served }) => served)
      .filter(({ kind }) => kind === 'dish')
      .slice(0, 2)
      .map(({ name: dish, text }) => dish ?? text);
    return `- ${name}: ${dishes.join(', ')}`;
  });
  return ['오늘 메뉴예요.', ...lines].join('\n');
}

export function mockAssistantReply(messages: readonly ChatMessage[]): AssistantReply {
  const last = messages.at(-1)?.text ?? '';
  if (SHUTTLE_WORDS.some((word) => last.includes(word))) {
    return { text: '셔틀이 어디 있는지 지도에서 볼 수 있어요.', mapButtons: ['shuttle'] };
  }
  if (MENU_WORDS.some((word) => last.includes(word))) {
    return { text: menusReply(), mapButtons: ['dining'] };
  }
  return {
    text: '데모에서는 오늘 메뉴와 셔틀만 답할 수 있어요. "오늘 점심 뭐 나와?"처럼 물어봐 주세요.',
    mapButtons: [],
  };
}
