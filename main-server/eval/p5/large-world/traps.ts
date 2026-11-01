/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type LargeGlobalEvent, type LargeQuest, questSchema } from './world-data.ts';

// The traps of the large world, by hand, on top of what is generated (P05 ticket 02b): look-alike words, 대면 against
// 비대면, times at a window's edge, what the server must drop, and Quests on another Board. Generated Quests have no 탁구
// or 스쿼시, so a question about either is decided by these alone.

export const quest = (
  key: string,
  title: string,
  activity: string,
  starts: string,
  trap: string,
  more: Partial<LargeQuest> = {},
): LargeQuest => {
  const end = new Date(Date.parse(`${starts}Z`) + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
  return questSchema.parse({
    key,
    title,
    description: '',
    activity,
    capacity: 4,
    holders: 2,
    started: Date.parse(`${starts}Z`) < Date.parse('2026-11-02T14:05Z'),
    asker: 'none',
    joinPolicy: 'open',
    board: 'hobby',
    starts,
    ends: end,
    place: { label: '체육관 탁구장' },
    trap,
    ...more,
  });
};

const tableTennis = (key: string, starts: string, trap: string, more?: Partial<LargeQuest>): LargeQuest =>
  quest(key, '탁구 치실 분', 'tabletennis', starts, trap, more);

// Each around one window of the questions on 탁구. Beside each: in the window or out of it.
const EDGES = [
  tableTennis('t-today-started', '2026-11-02T13:30', 'started before the clock, and not over: out'),
  tableTennis('t-today-ahead', '2026-11-02T14:30', 'ahead of the clock: in'),
  tableTennis('t-noon-before', '2026-11-03T10:59', '점심 begins at 11: out'),
  tableTennis('t-noon-start', '2026-11-03T11:00', '점심 begins at 11: in'),
  tableTennis('t-noon-last', '2026-11-03T15:59', '점심 ends at 16: in'),
  tableTennis('t-noon-after', '2026-11-03T16:01', '점심 ends at 16: out'),
  tableTennis('t-morning-before', '2026-11-04T06:59', '아침 begins at 07: out'),
  tableTennis('t-morning-start', '2026-11-04T07:00', '아침 begins at 07: in'),
  tableTennis('t-morning-last', '2026-11-04T10:59', '아침 ends at 11: in'),
  tableTennis('t-morning-after', '2026-11-04T11:01', '아침 ends at 11: out'),
  tableTennis('t-evening-before', '2026-11-05T16:59', '저녁 begins at 17: out'),
  tableTennis('t-evening-start', '2026-11-05T17:00', '저녁 begins at 17: in'),
  tableTennis('t-evening-middle', '2026-11-05T19:30', '저녁: in'),
  tableTennis('t-evening-last', '2026-11-05T21:59', '저녁 ends at 22: in'),
  tableTennis('t-evening-after', '2026-11-05T22:01', '저녁 ends at 22: out'),
  tableTennis('t-after-before', '2026-11-06T21:59', '22시 이후 holds its start: out'),
  tableTennis('t-after-start', '2026-11-06T22:00', '22시 이후 holds its start: in'),
  tableTennis('t-after-last', '2026-11-06T23:59', 'after alone ends at 23:59: in'),
  tableTennis('t-after-next-day', '2026-11-07T00:00', 'after alone ends at 23:59: out'),
  tableTennis('t-both-before', '2026-11-07T14:59', '15시부터 18시까지: out'),
  tableTennis('t-both-start', '2026-11-07T15:00', '15시부터 18시까지 holds both ends: in'),
  tableTennis('t-both-end', '2026-11-07T18:00', '15시부터 18시까지 holds both ends: in'),
  tableTennis('t-both-after', '2026-11-07T18:01', '15시부터 18시까지: out'),
  tableTennis('t-named-before', '2026-11-08T18:29', '19시 ±30 minutes: out'),
  tableTennis('t-named-first', '2026-11-08T18:30', '19시 ±30 minutes holds exactly 30: in'),
  tableTennis('t-named-at', '2026-11-08T19:00', '19시: in'),
  tableTennis('t-named-last', '2026-11-08T19:30', '19시 ±30 minutes holds exactly 30: in'),
  tableTennis('t-named-after', '2026-11-08T19:31', '19시 ±30 minutes: out'),
];

// 배민 looks like 배드민턴 and means 배달: asked for one, the other is wrong.
const LOOK_ALIKES = [
  quest('t-baemin-1', '배민 같이 시켜요', 'delivery', '2026-11-05T12:10', 'looks like 배드민턴', { board: 'meal' }),
  quest('t-baemin-2', '배민 공동 주문 하실 분', 'delivery', '2026-11-05T18:40', 'looks like 배드민턴', {
    board: 'meal',
  }),
  quest('t-badminton-1', '배드민턴 치실 분', 'badminton', '2026-11-05T18:20', 'beside 배민 on the same day'),
];

// What the server must drop, on a Wednesday evening of 스쿼시, which no generated Quest is.
const DROPPED = [
  quest('t-full', '스쿼시 치실 분', 'squash', '2026-11-04T19:10', 'Full: out', { capacity: 4, holders: 4 }),
  quest('t-one-left', '스쿼시 한 게임 해요', 'squash', '2026-11-04T19:20', 'one place left', {
    capacity: 4,
    holders: 3,
  }),
  quest('t-two-left', '스쿼시 같이 쳐요', 'squash', '2026-11-04T19:40', 'two places left', { capacity: 4, holders: 2 }),
  quest('t-asked', '스쿼시 치실 분', 'squash', '2026-11-04T20:10', 'already asked to join: out', {
    joinPolicy: 'approval',
    asker: 'asked',
  }),
  quest('t-held', '스쿼시 치실 분', 'squash', '2026-11-04T20:20', 'the asker holds it: out', { asker: 'holds' }),
  quest('t-closed', '스쿼시 한 게임 해요', 'squash', '2026-11-04T20:30', 'Closed: out', {
    joinPolicy: 'closed',
    board: null,
  }),
];

// Posted on another Board than the obvious one (rules.md, section 5).
const OTHER_BOARDS = [
  quest('t-board-hiking', '관악산 등산 가요', 'hiking', '2026-11-08T08:10', 'hiking on the meal Board', {
    board: 'meal',
  }),
  quest('t-board-basketball', '농구 하실 분', 'basketball', '2026-11-06T18:10', 'basketball on the career Board', {
    board: 'career',
  }),
  quest('t-board-photo', '사진전 같이 봐요', 'photo', '2026-11-07T13:10', 'a 사진전 on the hobby Board', {
    board: 'hobby',
  }),
  quest('t-board-study', '코딩 테스트 스터디', 'coding', '2026-11-08T14:10', 'a study on the hobby Board', {
    board: 'hobby',
  }),
  quest('t-board-meal', '학식 같이 먹어요', 'cafeteria', '2026-11-03T12:10', 'a meal on the career Board', {
    board: 'career',
  }),
];

// Misspelt posts that a question under the right word must find.
const TYPOS = [
  quest('t-typo-futsal', '풋쌀 번개', 'futsal', '2026-11-07T19:10', 'misspelt'),
  quest('t-typo-malatang', '마라땅 드실 분', 'malatang', '2026-11-05T12:40', 'misspelt', { board: 'meal' }),
  quest('t-typo-musical', '뮤지걸 보러 가실 분', 'musical', '2026-11-08T18:10', 'misspelt', { board: 'show' }),
];

const event = (
  key: string,
  title: string,
  activity: string,
  starts: string,
  ends: string | null,
  trap: string,
): LargeGlobalEvent => ({
  key,
  title,
  description: '',
  activity,
  starts,
  ends,
  place: '문화관 대극장',
  latitude: 37.46159,
  longitude: 126.95104,
  trap,
});

const EVENTS = [
  // 대면 is inside 비대면, so that a filter on the word finds both. RESERVED_LECTURE_DAY holds no other 특강.
  event('te-face-1', '인문대학 대면 특강', 'lecture', '2026-11-06T10:30', '2026-11-06T12:20', '대면'),
  event('te-face-2', '공과대학 대면 특강', 'lecture', '2026-11-06T15:00', '2026-11-06T17:20', '대면'),
  event('te-online-1', '경영대학 비대면 특강', 'lecture', '2026-11-06T13:00', '2026-11-06T15:20', '비대면'),
  event('te-online-2', '사회과학대학 비대면 특강', 'lecture', '2026-11-06T19:00', '2026-11-06T20:20', '비대면'),
  // Misspelt events.
  event('te-typo-concert', '인문대학 재즈 콘서드', 'concert', '2026-11-06T19:30', '2026-11-06T21:20', 'misspelt'),
  event('te-typo-fair', '총학생회 채용 박랍회', 'fair', '2026-11-06T13:30', '2026-11-06T17:20', 'misspelt'),
  // The asker holds a Shared Quest for this one, so that its other Quests are out.
  event('te-shared', '총학생회 초청 콘서트', 'concert', '2026-11-07T18:30', '2026-11-07T20:20', 'the asker goes'),
  // Named by a question: its Quests, and those with no Global Event of its activity within its span.
  event('te-named', '제9회 관악 사진전', 'photo', '2026-11-04T10:00', '2026-11-04T18:20', 'named'),
  // Under way at the clock, and until the end of the week.
  event('te-under-way', '미술대학 판화 특별전', 'art', '2026-10-28T10:00', '2026-11-09T18:20', 'under way'),
];

const forEvent = (
  key: string,
  title: string,
  activity: string,
  globalEvent: string,
  more: { capacity?: number; holders?: number; asker?: 'none' | 'holds' | 'asked'; started?: boolean } = {},
): LargeQuest => {
  const { capacity = 4, holders = 2, asker = 'none', started = false } = more;
  return {
    key,
    title,
    description: '',
    activity,
    capacity,
    holders,
    started,
    asker,
    joinPolicy: 'open',
    board: 'show',
    globalEvent,
    trap: `for ${globalEvent}`,
  };
};

const FOR_EVENTS = [
  forEvent('t-shared-mine', '콘서트 같이 가실 분', 'concert', 'te-shared', { asker: 'holds' }),
  forEvent('t-shared-other-1', '콘서트 보러 가요', 'concert', 'te-shared'),
  forEvent('t-shared-other-2', '재즈 콘서트 같이 가요', 'concert', 'te-shared'),
  forEvent('t-named-1', '사진전 같이 봐요', 'photo', 'te-named'),
  forEvent('t-named-2', '사진전 보러 가실 분', 'photo', 'te-named'),
  forEvent('t-under-way-1', '판화전 같이 봐요', 'art', 'te-under-way', { started: true }),
  forEvent('t-under-way-2', '미술전 보러 가실 분', 'art', 'te-under-way', { started: true }),
];

export function traps(): { globalEvents: LargeGlobalEvent[]; quests: LargeQuest[] } {
  return {
    globalEvents: EVENTS,
    quests: [...EDGES, ...LOOK_ALIKES, ...DROPPED, ...OTHER_BOARDS, ...TYPOS, ...FOR_EVENTS],
  };
}
