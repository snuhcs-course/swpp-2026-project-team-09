/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The questions of subsets H, S, N, R, O, B and E of the large world (P05 ticket 02b): what conditions narrow.

import {
  after,
  both,
  days,
  DAYS,
  evening,
  events,
  EXHIBITIONS,
  lunch,
  morning,
  parties,
  type Question,
  SHOWS,
  SPORTS,
  STUDIES,
  WEEK,
  within,
} from './question-builders.ts';

const tableTennis = { activities: ['tabletennis'], words: ['탁구'] };

const H: Question[] = [
  parties('large-h-01', 'H', '목요일 저녁에 탁구 파티 있어?', evening(DAYS.목), tableTennis, {
    holds: ['t-evening-start', 't-evening-last'],
    lacks: ['t-evening-before', 't-evening-after'],
  }),
  parties('large-h-02', 'H', '금요일 22시 이후에 탁구 파티 있어?', after(DAYS.금, '22:00'), tableTennis, {
    holds: ['t-after-start', 't-after-last'],
    lacks: ['t-after-before', 't-after-next-day'],
  }),
  parties(
    'large-h-03',
    'H',
    '토요일 15시부터 18시까지 탁구 파티 있어?',
    within(DAYS.토, '15:00', '18:00'),
    tableTennis,
    { holds: ['t-both-start', 't-both-end'], lacks: ['t-both-before', 't-both-after'] },
  ),
  parties('large-h-04', 'H', '일요일 저녁 7시에 탁구 파티 있어?', within(DAYS.일, '18:30', '19:30'), tableTennis, {
    holds: ['t-named-first', 't-named-last'],
    lacks: ['t-named-before', 't-named-after'],
  }),
  parties('large-h-05', 'H', '수요일 아침에 탁구 파티 있어?', morning(DAYS.수), tableTennis, {
    holds: ['t-morning-start', 't-morning-last'],
    lacks: ['t-morning-before', 't-morning-after'],
  }),
  parties('large-h-06', 'H', '화요일 점심에 탁구 파티 있어?', lunch(DAYS.화), tableTennis, {
    holds: ['t-noon-start', 't-noon-last'],
    lacks: ['t-noon-before', 't-noon-after'],
  }),
  parties('large-h-07', 'H', '오늘 탁구 파티 있어?', days(DAYS.오늘), tableTennis, {
    holds: ['t-today-ahead'],
    lacks: ['t-today-started'],
  }),
];

const squash = { activities: ['squash'], words: ['스쿼시'] };

const S: Question[] = [
  parties(
    'large-s-01',
    'S',
    '수요일 저녁에 2자리 이상 남은 스쿼시 파티 있어?',
    evening(DAYS.수),
    { ...squash, minPlacesLeft: 2 },
    { holds: ['t-two-left'], lacks: ['t-one-left', 't-full', 't-asked', 't-held', 't-closed'] },
  ),
  parties('large-s-02', 'S', '수요일 저녁에 자리 남은 스쿼시 파티 있어?', evening(DAYS.수), squash, {
    holds: ['t-one-left', 't-two-left'],
    lacks: ['t-full', 't-asked', 't-held', 't-closed'],
  }),
  parties(
    'large-s-03',
    'S',
    '총학생회 초청 콘서트 가는 파티 있어?',
    within(DAYS.토, '18:30', '20:20'),
    { activities: ['concert'], words: ['콘서트'], forEvent: 'te-shared' },
    { lacks: ['t-shared-mine', 't-shared-other-1', 't-shared-other-2'] },
  ),
  parties('large-s-04', 'S', '목요일에 3자리 이상 남은 학식 파티 있어?', days(DAYS.목), {
    activities: ['cafeteria'],
    words: ['학식', '학생식당'],
    minPlacesLeft: 3,
  }),
  parties('large-s-05', 'S', '이번 주에 3자리 이상 남은 풋살 파티 있어?', WEEK, {
    activities: ['futsal'],
    words: ['풋살'],
    minPlacesLeft: 3,
  }),
];

const N: Question[] = [
  parties('large-n-01', 'N', '이번 주에 4명 모집하는 농구 파티 있어?', WEEK, {
    activities: ['basketball'],
    words: ['농구'],
    capacity: 4,
  }),
  parties('large-n-02', 'N', '이번 주에 정원 2명인 학식 파티 있어?', WEEK, {
    activities: ['cafeteria'],
    words: ['학식', '학생식당'],
    capacity: 2,
  }),
  parties('large-n-03', 'N', '이번 주에 6명 모집하는 볼링 파티 있어?', WEEK, {
    activities: ['bowling'],
    words: ['볼링'],
    capacity: 6,
  }),
  parties('large-n-04', 'N', '이번 주에 정원 8명인 풋살 파티 있어?', WEEK, {
    activities: ['futsal'],
    words: ['풋살'],
    capacity: 8,
  }),
  parties('large-n-05', 'N', '이번 주에 4명 모집하는 테니스 파티 있어?', WEEK, {
    activities: ['tennis'],
    words: ['테니스'],
    capacity: 4,
  }),
];

const nearby = (place: string): { place: string; metres: number } => ({ place, metres: 300 });

const R: Question[] = [
  parties('large-r-01', 'R', '이번 주에 제1공학관 근처에서 하는 스터디 파티 있어?', WEEK, {
    activities: STUDIES,
    words: ['스터디', '코딩', '토익', '면접', '알고리즘'],
    near: nearby('제1공학관'),
  }),
  parties('large-r-02', 'R', '이번 주에 학생회관 근처에서 학식 먹는 파티 있어?', WEEK, {
    activities: ['cafeteria'],
    words: ['학식', '학생식당'],
    near: nearby('학생회관'),
  }),
  parties('large-r-03', 'R', '화요일에 체육관 근처에서 하는 운동 파티 있어?', days(DAYS.화), {
    activities: SPORTS,
    words: ['운동', '러닝', '등산', '배드민턴', '농구'],
    near: nearby('체육관'),
  }),
  parties('large-r-04', 'R', '토요일에 문화관 근처에서 하는 공연 파티 있어?', days(DAYS.토), {
    activities: SHOWS,
    words: ['콘서트', '독주회', '뮤지컬', '버스킹', '음악제'],
    near: nearby('문화관'),
  }),
  parties('large-r-05', 'R', '이번 주에 중앙도서관 근처에서 하는 토익 스터디 파티 있어?', WEEK, {
    activities: ['toeic'],
    words: ['토익'],
    near: nearby('중앙도서관 본관'),
  }),
];

const O: Question[] = [
  events(
    'large-o-01',
    'O',
    '수요일 오후 3시쯤 볼 수 있는 전시 행사 있어?',
    within(DAYS.수, '14:30', '15:30'),
    { activities: EXHIBITIONS, words: ['사진전', '미술전', '판화', '회화전', '조각전'] },
    { holds: ['te-under-way', 'te-named'] },
  ),
  events(
    'large-o-02',
    'O',
    '오늘 17시 이후에 진행 중인 판화전 행사 있어?',
    after(DAYS.오늘, '17:00'),
    { activities: ['art'], words: ['판화'], titleHolds: '판화' },
    { holds: ['te-under-way'] },
  ),
  parties(
    'large-o-03',
    'O',
    '금요일 15시부터 17시까지 판화전 보러 가는 파티 있어?',
    within(DAYS.금, '15:00', '17:00'),
    { activities: ['art'], words: ['판화', '미술전', '회화전', '조각전'] },
    { holds: ['t-under-way-1', 't-under-way-2'] },
  ),
  parties(
    'large-o-04',
    'O',
    '제9회 관악 사진전 가는 파티 있어?',
    within(DAYS.수, '10:00', '18:20'),
    { activities: ['photo'], words: ['사진전'], forEvent: 'te-named' },
    { holds: ['t-named-1', 't-named-2'] },
  ),
  parties(
    'large-o-05',
    'O',
    '오늘 미술전 보러 가는 파티 있어?',
    days(DAYS.오늘),
    { activities: ['art'], words: ['미술전', '판화', '회화전', '조각전'] },
    { holds: ['t-under-way-1', 't-under-way-2'] },
  ),
];

const B: Question[] = [
  parties(
    'large-b-01',
    'B',
    '일요일 아침에 등산 파티 있어?',
    morning(DAYS.일),
    { activities: ['hiking'], words: ['등산', '산행', '관악산'] },
    { holds: ['t-board-hiking'] },
  ),
  parties(
    'large-b-02',
    'B',
    '금요일 저녁에 농구 파티 있어?',
    evening(DAYS.금),
    { activities: ['basketball'], words: ['농구'] },
    { holds: ['t-board-basketball'] },
  ),
  parties(
    'large-b-03',
    'B',
    '토요일 점심에 사진전 파티 있어?',
    lunch(DAYS.토),
    { activities: ['photo'], words: ['사진전'] },
    { holds: ['t-board-photo'] },
  ),
  parties(
    'large-b-04',
    'B',
    '일요일 점심에 코딩 스터디 파티 있어?',
    lunch(DAYS.일),
    { activities: ['coding'], words: ['코딩', '코테', '알고리즘'] },
    { holds: ['t-board-study'] },
  ),
  parties(
    'large-b-05',
    'B',
    '화요일 점심에 학식 파티 있어?',
    lunch(DAYS.화),
    { activities: ['cafeteria'], words: ['학식', '학생식당'] },
    { holds: ['t-board-meal'] },
  ),
];

const E: Question[] = [
  parties('large-e-01', 'E', '이번 주에 스키 파티 있어?', WEEK, { activities: [], words: ['스키'] }),
  events('large-e-02', 'E', '이번 주에 요가 행사 있어?', WEEK, { activities: [], words: ['요가'] }),
  both('large-e-03', 'E', '이번 주에 수영 있어?', WEEK, { activities: [], words: ['수영'] }),
  parties('large-e-04', 'E', '화요일 새벽 3시에 볼링 파티 있어?', within(DAYS.화, '02:30', '03:30'), {
    activities: ['bowling'],
    words: ['볼링'],
  }),
  events('large-e-05', 'E', '이번 주에 탁구 행사 있어?', WEEK, { activities: ['tabletennis'], words: ['탁구'] }),
  parties('large-e-06', 'E', '12월 25일에 볼링 파티 있어?', days('2026-12-25'), {
    activities: ['bowling'],
    words: ['볼링'],
  }),
];

export const CONDITION_QUESTIONS: readonly Question[] = [...H, ...S, ...N, ...R, ...O, ...B, ...E];
