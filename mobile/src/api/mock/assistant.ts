/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, ChatMessage, Choice, ProposalPlace, QuestProposal } from '@/api/assistant-types';
import type { RecruitingQuest } from '@/api/party-types';
import { now } from '@/clock';
import { koreaDateKey, koreaNextDay } from '@/korea-time';
import { RECRUITING_QUESTS } from './data/boards';
import { FRIENDS } from './data/friends';
import { MENUS } from './data/menus';
import { GLOBAL_EVENTS } from './data/quests';

// The Assistant without a model: a question about the menus is answered from the mocks' menus of the day, one about
// the shuttle with its layer's button, a request to make or recruit for a 파티 with a Proposal for tomorrow's lunch,
// or, 비공개, a Closed one for the mocks' first Global Event inviting their first Friend,
// one about 파티 with the mocks' recruiting Quests that meet soonest as cards, one about events with the mocks' Global
// Events as cards, one that says 학관 with the question which Place it means and the candidates as chips, the answer
// to it with a Proposal for tomorrow's lunch there, and anything else with a short reply, so that the chat can be
// seen and tried where the app asks no main server.

const MENU_WORDS = ['메뉴', '학식', '점심', '저녁', '아침', '밥'];
const SHUTTLE_WORDS = ['셔틀', '버스'];
const EVENT_WORDS = ['행사', '공연', '축제', '설명회'];
const PROPOSAL_WORDS = ['모집해', '만들어'];
const QUEST_WORDS = ['파티', '같이 할', '모임'];
const PROPOSING = '이렇게 만들까요? 만들기를 누르기 전에는 아무것도 만들지 않아요.';
// The Places the main server's matcher finds for 학관, 학생회관 first. 유회진 학술정보관 is not among the mocks' Places.
const HAKGWAN: readonly Choice[] = [
  { kind: 'place', id: 'place-63', label: '학생회관', words: '학관' },
  { kind: 'place', id: 'place-919', label: '(관악사)학부 생활관', words: '학관' },
  { kind: 'place', id: 'place-300', label: '유회진 학술정보관', words: '학관' },
];
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

// 학관 as a word of its own, so that 제1공학관 does not name it.
function saysHakgwan(words: string): boolean {
  return words.split(/\s+/u).some((word) => word.startsWith('학관'));
}

// The candidate of 학관 the User's last message answers with, by its chip or by its name.
function chosenPlace(message: ChatMessage | undefined): ProposalPlace | null {
  if (message?.role !== 'user') {
    return null;
  }
  const { text, chosen } = message;
  const choice = HAKGWAN.find(({ id, label }) => id === chosen?.id || label === text.trim());
  return choice === undefined ? null : { id: choice.id, name: choice.label };
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

export function mockAssistantReply(messages: readonly ChatMessage[]): AssistantReply {
  const last = messages.at(-1)?.text ?? '';
  const place = chosenPlace(messages.at(-1));
  if (place !== null) {
    return { text: PROPOSING, mapButtons: [], cards: [], proposal: { ...lunchProposal(), place }, choices: [] };
  }
  if (saysHakgwan(last)) {
    const text = '학관은 여러 곳을 말할 수 있어요. 어디를 말씀하신 건가요?';
    return { text, mapButtons: [], cards: [], proposal: null, choices: [...HAKGWAN] };
  }
  if (SHUTTLE_WORDS.some((word) => last.includes(word))) {
    const text = '셔틀이 어디 있는지 지도에서 볼 수 있어요.';
    return { text, mapButtons: ['shuttle'], cards: [], proposal: null, choices: [] };
  }
  if (PROPOSAL_WORDS.some((word) => last.includes(word))) {
    return {
      text: PROPOSING,
      mapButtons: [],
      cards: [],
      proposal: last.includes('비공개') ? closedProposal() : lunchProposal(),
      choices: [],
    };
  }
  if (QUEST_WORDS.some((word) => last.includes(word))) {
    return {
      text: '곧 모이는 파티예요. 운동, 식사처럼 원하는 걸 말해 주시면 좁혀 드릴게요.',
      mapButtons: [],
      cards: questCards(),
      proposal: null,
      choices: [],
    };
  }
  if (EVENT_WORDS.some((word) => last.includes(word))) {
    const cards = GLOBAL_EVENTS.slice(0, EVENT_CARDS).map((globalEvent) => ({
      kind: 'globalEvent' as const,
      globalEvent,
    }));
    return { text: '다가오는 행사예요.', mapButtons: [], cards, proposal: null, choices: [] };
  }
  if (MENU_WORDS.some((word) => last.includes(word))) {
    return { text: menusReply(), mapButtons: ['dining'], cards: [], proposal: null, choices: [] };
  }
  return {
    text: '데모에서는 오늘 메뉴와 셔틀, 행사, 파티만 답할 수 있어요. "오늘 점심 뭐 나와?"처럼 물어봐 주세요.',
    mapButtons: [],
    cards: [],
    proposal: null,
    choices: [],
  };
}
