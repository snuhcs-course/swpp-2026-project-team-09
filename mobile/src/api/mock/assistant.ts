/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, ChatMessage, QuestProposal, RequestContext } from '@/api/assistant-types';
import type { RecruitingQuest } from '@/api/party-types';
import { now } from '@/clock';
import { koreaDateKey, koreaNextDay } from '@/korea-time';
import { RECRUITING_QUESTS } from './data/boards';
import { FRIENDS } from './data/friends';
import { MENUS } from './data/menus';
import { MEAL_ANSWER_REPLY } from './data/meal-answer';
import { GLOBAL_EVENTS } from './data/quests';
import { isLibraryAsk, libraryReply } from './library-replies';

// The Assistant without a model: a question about the menus is answered from the mocks' menus of the day, one about
// the shuttle with its layer's button, one about 관정도서관 with a library card, a request to make or recruit for a 파티
// with a Proposal for tomorrow's lunch, or, 비공개, a Closed one for the mocks' first Global Event inviting their first Friend,
// one about 파티 with the mocks' recruiting Quests that meet soonest as cards, one about events with the mocks' Global
// Events as cards, and anything else with a short reply, so that the chat can be seen and tried where the app asks no
// main server. Asked 배고파 with what the app knew (a context), it answers with the main server's real answer drawn on
// the map.

const MENU_WORDS = ['메뉴', '학식', '점심', '저녁', '아침', '밥'];
const SHUTTLE_WORDS = ['셔틀', '버스'];
const EVENT_WORDS = ['행사', '공연', '축제', '설명회'];
const PROPOSAL_WORDS = ['모집해', '만들어'];
const QUEST_WORDS = ['파티', '같이 할', '모임'];
// The most events, and the most Quests, the mock shows as cards.
const EVENT_CARDS = 3;
const QUEST_CARDS = 3;

function startOf({ nextSubQuest }: RecruitingQuest): number {
  return nextSubQuest.startsAt === null ? Number.POSITIVE_INFINITY : new Date(nextSubQuest.startsAt).getTime();
}

// The recruiting Quests that meet soonest, as the Assistant answers 파티 찾기.
function questCards(): AssistantReply['cards'] {
  return RECRUITING_QUESTS.toSorted((a, b) => startOf(a) - startOf(b))
    .slice(0, QUEST_CARDS)
    .map((quest) => ({ kind: 'quest' as const, quest }));
}

// Lunch at 12:00 tomorrow in Korea, on the meal Board, as the Assistant proposes "내일 점심 학식 같이 먹을 사람 모집해줘".
function lunchProposal(): QuestProposal {
  const tomorrow = koreaDateKey(koreaNextDay(now()));
  return {
    title: '학식 같이 먹어요',
    description: '내일 점심 학식 같이 먹을 사람 모집해요',
    joinPolicy: 'open',
    board: 'meal',
    capacity: 4,
    startsAt: `${tomorrow}T12:00:00+09:00`,
    place: null,
    globalEvent: null,
    invitees: [],
  };
}

// A 스터디 at 301동, whose study rooms 예약하샤 books, as the Assistant proposes "301동에서 스터디 모집해줘".
function studyProposal(): QuestProposal {
  return {
    ...lunchProposal(),
    title: '301동 스터디',
    description: '내일 점심에 301동에서 같이 공부해요',
    board: 'career',
    place: {
      id: 'place-301',
      name: '제1공학관',
      booking: { label: '예약하샤 스터디룸 예약', url: 'https://ssims.snu.ac.kr/index.do' },
    },
  };
}

// A 비공개 파티 for the mocks' first Global Event, at its start, inviting their first Friend.
function closedProposal(): QuestProposal {
  const event = GLOBAL_EVENTS[0] ?? null;
  const friend = FRIENDS[0];
  return {
    title: event === null ? '같이 가요' : `${event.title} 같이 가요`,
    description: '',
    joinPolicy: 'closed',
    board: null,
    capacity: 4,
    startsAt: event?.startsAt ?? lunchProposal().startsAt,
    place: null,
    globalEvent: event,
    invitees: friend === undefined ? [] : [{ id: friend.id, name: friend.name }],
  };
}

function proposalOf(asked: string): QuestProposal {
  if (asked.includes('비공개')) {
    return closedProposal();
  }
  return asked.includes('301') ? studyProposal() : lunchProposal();
}

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

export function mockAssistantReply(messages: readonly ChatMessage[], context?: RequestContext): AssistantReply {
  const last = messages.at(-1)?.text ?? '';
  if (context !== undefined && last.includes('배고파')) {
    return MEAL_ANSWER_REPLY;
  }
  if (SHUTTLE_WORDS.some((word) => last.includes(word))) {
    return { text: '셔틀이 어디 있는지 지도에서 볼 수 있어요.', mapButtons: ['shuttle'], cards: [], proposal: null };
  }
  if (isLibraryAsk(last)) {
    return libraryReply(last);
  }
  if (PROPOSAL_WORDS.some((word) => last.includes(word))) {
    return {
      text: '이렇게 만들까요? 만들기를 누르기 전에는 아무것도 만들지 않아요.',
      mapButtons: [],
      cards: [],
      proposal: proposalOf(last),
    };
  }
  if (QUEST_WORDS.some((word) => last.includes(word))) {
    return {
      text: '곧 모이는 파티예요. 운동, 식사처럼 원하는 걸 말해 주시면 좁혀 드릴게요.',
      mapButtons: [],
      cards: questCards(),
      proposal: null,
    };
  }
  if (EVENT_WORDS.some((word) => last.includes(word))) {
    const cards = GLOBAL_EVENTS.slice(0, EVENT_CARDS).map((globalEvent) => ({
      kind: 'globalEvent' as const,
      globalEvent,
    }));
    return { text: '다가오는 행사예요.', mapButtons: [], cards, proposal: null };
  }
  if (MENU_WORDS.some((word) => last.includes(word))) {
    return { text: menusReply(), mapButtons: ['dining'], cards: [], proposal: null };
  }
  return {
    text: '데모에서는 오늘 메뉴와 셔틀, 행사, 파티만 답할 수 있어요. "오늘 점심 뭐 나와?"처럼 물어봐 주세요.',
    mapButtons: [],
    cards: [],
    proposal: null,
  };
}
