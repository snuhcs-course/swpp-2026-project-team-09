/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type {
  AnswerReply,
  AssistantReply,
  ChatMessage,
  PlanInput,
  QuestProposal,
  RequestContext,
} from '@/api/assistant-types';
import type { Lookup, Tapped } from '@/api/lookup-types';
import type { RecruitingQuest } from '@/api/party-types';
import { now } from '@/clock';
import { koreaDateKey, koreaNextDay } from '@/korea-time';
import { RECRUITING_QUESTS } from './data/boards';
import { FRIENDS } from './data/friends';
import { MENUS } from './data/menus';
import { CROWDED_ASKED, crowdedMealAnswer, crowdedMealReply, crowdedWithFriend } from './data/crowded-meal';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from './data/meal-answer';
import { MEAL_ANSWER_MENUS_REPLY, MEAL_DINNER_MENUS } from './data/meal-answer-menus';
import { FRIEND_LOOKUP_REPLY } from './data/friend-lookup';
import { cancelReplyTo } from './data/cancel-quest';
import { partyChangeReplyTo } from './data/party-change';
import { pickReplyTo } from './data/pick';
import { MENU_LOOKUP_REPLY } from './data/menu-lookup';
import { NO_LOCATION_REPLY, NO_TIMETABLE_REPLY } from './data/missing-inputs';
import { refusalReplyTo } from './data/refusals';
import { isStepsAsk, stepsReplyOn } from './data/steps-answer';
import { STUDY_LOOKUP_REPLY } from './data/study-lookup';
import { FRIEND_TAPS, STAND_IN_FRIEND_TAP, TAP_LOOKUPS } from './data/tap-lookups';
import { EASED_ANSWER, NOT_NOW_ANSWER, NOT_NOW_ASKED, NOT_NOW_REPLY } from './data/unmet-plans';
import { WAY_LOOKUP_REPLY } from './data/way-lookup';
import { wayReplyOf } from './data/way-lookups';
import {
  MEAL_ANSWER_ALONE,
  MEAL_ANSWER_FIXED_START,
  MEAL_ANSWER_OTHER_ORIGIN,
  MEAL_ANSWER_THREE,
} from './data/meal-answers';
import { MEET_ANSWER, MEET_ANSWER_FROM_14 } from './data/meet-answer';
import { GLOBAL_EVENTS } from './data/quests';
import { isLibraryAsk, libraryReply } from './library-replies';
import { withMealSet } from './meal-set';
import { mockMadeQuests } from './plan-quest';
import { rowFourCopyOf, rowFourReplyOf } from './row-four-copies';
import { mockTimetable } from './timetable';

// The Assistant without a model: a question about the menus is answered from the mocks' menus of the day, one about
// the shuttle with its layer's button, one about 관정도서관 with a library card, a request to make or recruit for a 파티
// with a Proposal for tomorrow's lunch, or, 비공개, a Closed one for the mocks' first Global Event inviting their first Friend,
// one about 파티 with the mocks' recruiting Quests that meet soonest as cards, one about events with the mocks' Global
// Events as cards, and anything else with a short reply, so that the chat can be seen and tried where the app asks no
// main server. Asked 배고파 with what the app knew (a context), it answers with the main server's real answer drawn on
// the map, and it answers with the main server's real Lookups: where something is (어디) with 문화관,
// 301동식당's menu, where 민수 is, a place to study near here (이 근처) with board a9's study spaces over 공대, whatever
// area the app sent, in the words of boards q2 to q4 the way to 24동 on time (까지 몇 분), late (늦나), and by the
// shuttle (셔틀 탈까), and of board n21 the way to 919동 when the shuttle is not running (기숙사 가는 셔틀). The words of a
// board of row 8 get the main server's real refusal, before anything else. 배고파 without the location
// permission, or with no Class in the mock's Timetable, gets the main server's real answer of board n13 or n15, and
// board n11's words its answer of no time now. "뭐 먹을까" gets 배고파's answer with each Plan's menu, wherever the User is. A press on a building or a face is answered with the main server's real
// cards of row 6.

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

// "민준이랑 내일 2시 학생회관에서 볼 사람 모집해줘": open, at 학생회관 tomorrow at 14:00, inviting the Friend it names or 김민준.
function unionProposal(asked: string): QuestProposal {
  const friend = FRIENDS.find(({ name }) => asked.includes(name.slice(1))) ?? FRIENDS.find(({ id }) => id === 'f1');
  return {
    ...lunchProposal(),
    title: '학생회관에서 만나요',
    description: '내일 2시에 학생회관에서 만나요',
    board: 'hobby',
    startsAt: lunchProposal().startsAt.replace('T12:00', 'T14:00'),
    place: { id: 'place-63', name: '학생회관', booking: null },
    invitees: friend === undefined ? [] : [{ id: friend.id, name: friend.name }],
  };
}

function proposalOf(asked: string): QuestProposal {
  if (asked.includes('비공개')) {
    return closedProposal();
  }
  if (asked.includes('학생회관')) {
    return unionProposal(asked);
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

// The mock holds copies of meal answers and of one meet, asked as it first is and again from 14:00, so other conditions
// are read as a meal of the User alone. A meal 지금 of three is board n11's, and one eased from 지금 board n11b's.
function copyFor(input: PlanInput): AnswerReply {
  const rowFour = rowFourCopyOf(input);
  if (rowFour !== null) {
    return rowFour;
  }
  if (input.kind === 'meet') {
    return input.window.from === MEET_ANSWER_FROM_14.input.window.from ? MEET_ANSWER_FROM_14 : MEET_ANSWER;
  }
  if (input.kind === 'meal' && input.meal === 'dinner') {
    return MEAL_DINNER_MENUS;
  }
  if (input.kind === 'meal' && input.date === koreaDateKey(koreaNextDay(now())) && input.people.length <= 2) {
    const [, friend] = input.people;
    return friend === undefined
      ? crowdedMealAnswer(input.date, now().toISOString())
      : crowdedWithFriend(input.date, now().toISOString(), friend.userId);
  }
  const people = input.kind === 'meal' || input.kind === 'new-quest' ? input.people : [];
  const from = input.kind === 'meal' ? input.window.from : null;
  if (input.kind === 'meal' && input.window.now === true && (from !== null || people.length >= 3)) {
    return from === null ? NOT_NOW_ANSWER : EASED_ANSWER;
  }
  if (people.length <= 1) {
    return MEAL_ANSWER_ALONE;
  }
  if (people.length >= 3) {
    return MEAL_ANSWER_THREE;
  }
  if (from !== null) {
    return MEAL_ANSWER_FIXED_START;
  }
  const ownStart = people[0]?.constraints.some(({ kind }) => kind === 'from') ?? false;
  return ownStart ? MEAL_ANSWER_OTHER_ORIGIN : MEAL_ANSWER;
}

// A recalculation without a main server: the mock does not calculate, so it answers with the stored copy of the main
// server's real answer that fits who is in the conditions, whether the window's start is fixed, and where the User
// sets out from, holding the input it was given.
export function mockRecalculation(input: PlanInput): AnswerReply {
  return { ...copyFor(input), input };
}

// A press without a main server: the stored card of that building or Friend. The mock does not calculate, so a building
// it holds no card of answers 학생회관's, and an id that is none of its Friends answers 김민준's, standing in for a card
// it does not have.
export function mockTap(tapped: Tapped): Lookup {
  if (tapped.kind === 'place') {
    const stored = Object.values(TAP_LOOKUPS).find(({ scene }) => scene.places[0]?.place.placeId === tapped.placeId);
    return stored ?? TAP_LOOKUPS.a1;
  }
  return FRIEND_TAPS[tapped.userId] ?? STAND_IN_FRIEND_TAP;
}

// The stored answer of 배고파, the one of board n13 without the location permission, and else that of board n15 when
// the mock's Timetable holds no Class; each beside a lunch the User made from a Plan names it (P04 ticket 17).
function hungryReplyOf({ locationMissing }: RequestContext): AssistantReply {
  let reply = MEAL_ANSWER_REPLY;
  if (locationMissing === 'permission') {
    reply = NO_LOCATION_REPLY;
  } else if (mockTimetable.listClasses().length === 0) {
    reply = NO_TIMETABLE_REPLY;
  }
  return withMealSet(reply, mockMadeQuests());
}

// The stored refusal of a board of row 8, answers of 배고파, and Lookups of 301동식당's menu, of a place to study near
// here, of where 민수 is, and of a way with a deadline.
function drawnReplyOf(last: string, context: RequestContext): AssistantReply | null {
  const refused = refusalReplyTo(last);
  if (refused !== null) {
    return refused;
  }
  if (last.includes(NOT_NOW_ASKED)) {
    return NOT_NOW_REPLY;
  }
  const cancel = cancelReplyTo(last) ?? partyChangeReplyTo(last) ?? pickReplyTo(last);
  if (cancel !== null) {
    return cancel;
  }
  if (isStepsAsk(last)) {
    return stepsReplyOn(koreaDateKey(now()));
  }
  if (last.includes(CROWDED_ASKED)) {
    return crowdedMealReply(koreaDateKey(koreaNextDay(now())), now().toISOString());
  }
  if (last.includes('뭐 먹을까')) {
    return MEAL_ANSWER_MENUS_REPLY;
  }
  if (last.includes('배고파')) {
    return hungryReplyOf(context);
  }
  if (last.includes('301동식당') && last.includes('메뉴')) {
    return MENU_LOOKUP_REPLY;
  }
  if (last.includes('이 근처') && last.includes('공부')) {
    return STUDY_LOOKUP_REPLY;
  }
  if (last.includes('민수') && last.includes('어디')) {
    return FRIEND_LOOKUP_REPLY;
  }
  return rowFourReplyOf(last) ?? wayReplyOf(last);
}

export function mockAssistantReply(messages: readonly ChatMessage[], context: RequestContext): AssistantReply {
  const last = messages.at(-1)?.text ?? '';
  const drawn = drawnReplyOf(last, context);
  if (drawn !== null) {
    return drawn;
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
  if (last.includes('어디')) {
    return WAY_LOOKUP_REPLY;
  }
  return {
    text: '데모에서는 오늘 메뉴와 셔틀, 행사, 파티만 답할 수 있어요. "오늘 점심 뭐 나와?"처럼 물어봐 주세요.',
    mapButtons: [],
    cards: [],
    proposal: null,
  };
}
