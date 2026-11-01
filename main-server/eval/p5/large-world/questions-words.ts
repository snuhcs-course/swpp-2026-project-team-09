/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The questions of subsets V, L, P, T1 and T2 of the large world (P05 ticket 02b): many candidates and what words find.

import {
  after,
  days,
  DAYS,
  evening,
  events,
  morning,
  parties,
  type Question,
  SHOWS,
  SPORTS,
  WEEK,
} from './question-builders.ts';

const V: Question[] = [
  parties('large-v-01', 'V', '수요일 밤 10시 30분 이후에 파티 있어?', after(DAYS.수, '22:30'), {}),
  parties('large-v-02', 'V', '오늘 저녁 8시 이후 파티 찾아줘', after(DAYS.오늘, '20:00'), {}),
  events('large-v-03', 'V', '토요일 21시 이후 행사 있어?', after(DAYS.토, '21:00'), {}),
  events('large-v-04', 'V', '목요일 21시 이후에 하는 행사 찾아줘', after(DAYS.목, '21:00'), {}),
  parties('large-v-05', 'V', '금요일 저녁에 볼링 파티 있어?', evening(DAYS.금), {
    activities: ['bowling'],
    words: ['볼링'],
  }),
  parties('large-v-06', 'V', '목요일에 심야 라면 파티 있어?', days(DAYS.목), {
    activities: ['ramen'],
    words: ['라면'],
  }),
  parties('large-v-07', 'V', '금요일 저녁에 보드게임 파티 있어?', evening(DAYS.금), {
    activities: ['boardgame'],
    words: ['보드게임', '보겜'],
  }),
  parties('large-v-08', 'V', '화요일 저녁에 고기 먹는 파티 있어?', evening(DAYS.화), {
    activities: ['meat'],
    words: ['고기', '삼겹살', '목살'],
  }),
];

const L: Question[] = [
  parties(
    'large-l-01',
    'L',
    '화요일에 볼링 파티 있어?',
    days(DAYS.화),
    { activities: ['bowling'], words: ['볼링'] },
    { literal: '볼링' },
  ),
  parties(
    'large-l-02',
    'L',
    '토요일에 테니스 파티 있어?',
    days(DAYS.토),
    { activities: ['tennis'], words: ['테니스'] },
    { literal: '테니스' },
  ),
  events(
    'large-l-03',
    'L',
    '이번 주에 설명회 행사 있어?',
    WEEK,
    { activities: ['infosession'], words: ['설명회'] },
    { literal: '설명회' },
  ),
  // 대면 is inside 비대면.
  events(
    'large-l-04',
    'L',
    '금요일에 비대면 특강 행사 있어?',
    days(DAYS.금),
    { activities: ['lecture'], titleHolds: '비대면', words: ['비대면', '특강'] },
    { holds: ['te-online-1', 'te-online-2'] },
  ),
  events(
    'large-l-05',
    'L',
    '금요일에 대면으로 하는 특강 행사 있어?',
    days(DAYS.금),
    { activities: ['lecture'], titleLacks: '비대면', words: ['대면', '특강'] },
    { holds: ['te-face-1', 'te-face-2'], lacks: ['te-online-1', 'te-online-2'] },
  ),
];

const P: Question[] = [
  events('large-p-01', 'P', '수요일에 공연 행사 뭐 있어?', days(DAYS.수), {
    activities: SHOWS,
    words: ['콘서트', '독주회', '뮤지컬', '버스킹', '음악제'],
  }),
  parties('large-p-02', 'P', '일요일 아침에 운동 파티 있어?', morning(DAYS.일), {
    activities: SPORTS,
    words: ['운동', '러닝', '등산', '배드민턴', '농구'],
  }),
  parties('large-p-03', 'P', '화요일에 민턴 파티 있어?', days(DAYS.화), { activities: ['badminton'], words: ['민턴'] }),
  parties('large-p-04', 'P', '금요일에 조깅 파티 있어?', days(DAYS.금), {
    activities: ['running'],
    words: ['조깅', '러닝', '달리'],
  }),
  // 배민 is 배달, and only looks like 배드민턴.
  parties(
    'large-p-05',
    'P',
    '목요일에 배민 같이 시킬 파티 있어?',
    days(DAYS.목),
    { activities: ['delivery'], words: ['배민', '배달'] },
    { holds: ['t-baemin-1', 't-baemin-2'], lacks: ['t-badminton-1'] },
  ),
];

const T1: Question[] = [
  events(
    'large-t1-01',
    'T1',
    '금요일에 콘서트 행사 있어?',
    days(DAYS.금),
    { activities: ['concert'], words: ['콘서트'] },
    { holds: ['te-typo-concert'] },
  ),
  parties(
    'large-t1-02',
    'T1',
    '토요일 저녁에 풋살 파티 있어?',
    evening(DAYS.토),
    { activities: ['futsal'], words: ['풋살'] },
    { holds: ['t-typo-futsal'] },
  ),
  parties(
    'large-t1-03',
    'T1',
    '목요일에 마라탕 먹는 파티 있어?',
    days(DAYS.목),
    { activities: ['malatang'], words: ['마라탕'] },
    { holds: ['t-typo-malatang'] },
  ),
  parties(
    'large-t1-04',
    'T1',
    '일요일 저녁에 뮤지컬 파티 있어?',
    evening(DAYS.일),
    { activities: ['musical'], words: ['뮤지컬'] },
    { holds: ['t-typo-musical'] },
  ),
  events(
    'large-t1-05',
    'T1',
    '금요일에 박람회 행사 있어?',
    days(DAYS.금),
    { activities: ['fair'], words: ['박람회'] },
    { holds: ['te-typo-fair'] },
  ),
];

const T2: Question[] = [
  parties('large-t2-01', 'T2', '화요일에 베드민턴 파티 있어?', days(DAYS.화), {
    activities: ['badminton'],
    words: ['배드민턴', '민턴'],
  }),
  events('large-t2-02', 'T2', '목요일에 콘서드 행사 있어?', days(DAYS.목), {
    activities: ['concert'],
    words: ['콘서트'],
  }),
  parties('large-t2-03', 'T2', '목요일 저녁에 볼림 파티 있어?', evening(DAYS.목), {
    activities: ['bowling'],
    words: ['볼링'],
  }),
  parties('large-t2-04', 'T2', '일요일에 마라땅 파티 있어?', days(DAYS.일), {
    activities: ['malatang'],
    words: ['마라탕'],
  }),
  events('large-t2-05', 'T2', '수요일에 박랍회 행사 있어?', days(DAYS.수), { activities: ['fair'], words: ['박람회'] }),
];

export const WORD_QUESTIONS: readonly Question[] = [...V, ...L, ...P, ...T1, ...T2];
