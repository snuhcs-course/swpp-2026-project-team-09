/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import { v5 as uuidv5 } from 'uuid';
import { koreaDate } from '../assistant/korea-time.js';
import { QuestBoard, Weekday } from '../generated/prisma/client.js';
import { type UatAccount } from './uat-accounts.js';

// What each scenario of the UAT sheet needs before its first step, as the sheet's Setup tells it. Every time counts
// from the run, so a rehearsal on another day prepares the same. What the tester and the team make in the steps is
// theirs to make, and is not here.

export const UAT_SCENARIOS = ['risk1', 'risk2', 'risk3', 'risk4', 'risk5'] as const;
export type UatScenario = (typeof UAT_SCENARIOS)[number];

export type Letter = UatAccount['letter'];

const ID_NAMESPACE = '5b0f6a8e-7c1d-4e7e-9b53-4d3f0c2a9a11';

// The same id in every database and every run.
export function uatId(name: string): string {
  return uuidv5(`uat:${name}`, ID_NAMESPACE);
}

// The event of Risk 4 that is cancelled where the sheet has an Administrator cancel it.
export const UAT_EVENT = uatId('global-event:event');

export const MINUTE = 60 * 1000;
export const DAY = 24 * 60 * MINUTE;
const WEEKDAYS = [
  Weekday.sunday,
  Weekday.monday,
  Weekday.tuesday,
  Weekday.wednesday,
  Weekday.thursday,
  Weekday.friday,
  Weekday.saturday,
];

// The calendar days in Korea around the run, and the times on them.
export interface Days {
  now: Date;
  // The day `offset` days after today, as "2026-11-16".
  day: (offset: number) => string;
  // "19:20" on that day, in Korea.
  at: (offset: number, time: string) => Date;
  weekday: (offset: number) => Weekday;
}

export function daysFrom(now: Date): Days {
  const day = (offset: number): string => koreaDate(new Date(now.getTime() + offset * DAY));
  return {
    now,
    day,
    at: (offset, time) => new Date(`${day(offset)}T${time}:00+09:00`),
    weekday: (offset) => WEEKDAYS[new Date(`${day(offset)}T00:00:00Z`).getUTCDay()] ?? Weekday.monday,
  };
}

// "16:05" in Korea.
function clock(at: Date): string {
  return new Date(at.getTime() + 9 * 60 * MINUTE).toISOString().slice(11, 16);
}

export interface EventSpec {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  // The campus map's number of the Place.
  place: string;
  state: 'published' | 'draft' | 'cancelled';
}

export interface QuestSpec {
  title: string;
  leader: Letter;
  // Private when left out: a Closed Quest on no Board.
  joinPolicy?: 'open' | 'approval';
  // 취미 when left out.
  board?: QuestBoard;
  capacity: number;
  description?: string;
  // A Quest of its own has a start and no end, as one posted in the app has.
  startsAt?: Date;
  // The campus map's number, or words that name no Place.
  place?: string;
  placeLabel?: string;
  // The Global Event the Quest goes to, in place of a time and a Place of its own.
  globalEventId?: string;
}

export interface ClassSpec {
  owner: Letter;
  courseName: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  place: string;
}

export interface Prepared {
  // Who is Friends with whom, and whose 친구와 위치 공유 is on.
  friends: [Letter, Letter][];
  masterSwitchOn: Letter[];
  events: EventSpec[];
  quests: QuestSpec[];
  classes: ClassSpec[];
  // The day whose menus are removed, as "2026-11-22".
  noMenuDay: string | null;
  // What the host reads out or checks before the scenario, in Korean.
  notes: string[];
}

const NOTHING = { masterSwitchOn: [], events: [], quests: [], classes: [], noMenuDay: null };

const badminton = (
  title: string,
  joinPolicy: 'open' | 'approval',
  capacity: number,
  startsAt: Date,
  place: string,
): QuestSpec => ({ title, leader: 'B', joinPolicy, capacity, description: '배드민턴 같이 쳐요.', startsAt, place });

function risk1Events({ at }: Days): EventSpec[] {
  const event = (key: string, title: string, start: string, end: string, state: EventSpec['state']): EventSpec => ({
    id: uatId(`global-event:${key}`),
    title,
    startsAt: at(1, start),
    endsAt: at(1, end),
    place: '301',
    state,
  });
  return [
    event('badminton-cup', '[UAT] 배드민턴 대회', '19:00', '21:00', 'published'),
    event('badminton-heats', '[UAT] 배드민턴 예선', '18:00', '20:00', 'draft'),
    event('badminton-friendly', '[UAT] 배드민턴 친선전', '18:30', '20:30', 'cancelled'),
  ];
}

function risk1(days: Days): Prepared {
  const { now, at } = days;
  const started = new Date(now.getTime() - 30 * MINUTE);
  return {
    ...NOTHING,
    friends: [['A', 'B']],
    events: risk1Events(days),
    quests: [
      badminton('[UAT] 민턴 바로', 'open', 6, at(1, '19:20'), '301'),
      badminton('[UAT] 민턴 승인', 'approval', 2, at(1, '18:50'), '302'),
      badminton('[UAT] 민턴 마감', 'open', 1, at(1, '19:10'), '301'),
      { title: '[UAT] 민턴 비공개', leader: 'B', capacity: 4, startsAt: at(1, '19:00'), place: '301' },
      badminton('[UAT] 민턴 진행 중', 'open', 4, started, '301'),
    ],
    notes: [
      'A–B 친구, C는 친구 아님.',
      `B의 파티: 내일 민턴 바로(19:20)·승인(18:50)·마감(19:10)·비공개(19:00), 오늘 민턴 진행 중(${clock(started)} 시작).`,
      '행사: 내일 배드민턴 대회(공개)·예선(초안)·친선전(취소).',
    ],
  };
}

function risk2(): Prepared {
  return {
    ...NOTHING,
    friends: [],
    notes: ['친구 없음, 세 계정 모두 "친구와 위치 공유" 꺼짐.', 'B의 친구 ID: UATB2345'],
  };
}

const gap = (title: string, capacity: number, startsAt: Date): QuestSpec => ({
  title,
  leader: 'B',
  joinPolicy: 'open',
  capacity,
  startsAt,
  place: '302',
});

// The sheet's lunch, moved to dinner (17:00–19:30) because the session starts after lunch has ended. The gap between
// A's two Classes is 17:00–18:30, and each time keeps the sheet's distance from the gap's ends.
function risk3({ at, day, weekday }: Days): Prepared {
  const today = weekday(0);
  // The coming Sunday, never today.
  const noMenuDay = day(7 - WEEKDAYS.indexOf(today));
  const { place: _noPlace, ...nowhere } = gap('[UAT] Gap 장소없음', 4, at(0, '17:35'));
  return {
    ...NOTHING,
    friends: [
      ['A', 'B'],
      ['A', 'C'],
    ],
    events: [
      {
        id: uatId('global-event:gap-event'),
        title: '[UAT] Gap Event',
        startsAt: at(0, '17:35'),
        endsAt: at(0, '17:55'),
        place: '302',
        state: 'published',
      },
    ],
    quests: [
      gap('[UAT] Gap', 4, at(0, '17:25')),
      gap('[UAT] Gap 늦음', 4, at(0, '18:25')),
      gap('[UAT] Gap 마감', 1, at(0, '17:30')),
      { ...nowhere, placeLabel: '우리 동아리방' },
    ],
    classes: [
      { owner: 'C', courseName: '[UAT] C 수업', weekday: today, startTime: '16:30', endTime: '20:00', place: '301' },
    ],
    noMenuDay,
    notes: [
      'A–B, A–C 친구. C는 오늘 16:30–20:00 수업(저녁 내내), B는 수업 없음.',
      'A가 직접 넣을 수업: [UAT] 수업 1 = 오늘 요일 15:45–17:00 301동, [UAT] 수업 2 = 18:30–19:45 301동 (공강 17:00–18:30).',
      'B의 파티(오늘): Gap 17:25 · Gap 마감 17:30 · Gap 장소없음 17:35 · Gap 늦음 18:25. 행사 Gap Event 17:35–17:55 (302동).',
      `메뉴 없는 날: 이번 주 일요일(${noMenuDay}). 그날 메뉴를 전부 지웠어요.`,
      '시트의 "점심"은 전부 "저녁"으로 바꿔 말해요. 17:00 전에 끝내야 해요.',
    ],
  };
}

// The short event ends 8 minutes after the run, so that it is listed when the scenario starts and gone by its last
// step.
function risk4({ now, at }: Days): Prepared {
  const shortEnds = new Date(Math.ceil((now.getTime() + 8 * MINUTE) / MINUTE) * MINUTE);
  const going = { board: QuestBoard.show, capacity: 4, globalEventId: UAT_EVENT };
  return {
    ...NOTHING,
    friends: [],
    masterSwitchOn: ['A', 'B'],
    events: [
      {
        id: UAT_EVENT,
        title: '[UAT] Event',
        startsAt: at(0, '19:00'),
        endsAt: at(0, '21:00'),
        place: '301',
        state: 'published',
      },
      {
        id: uatId('global-event:short'),
        title: '[UAT] 짧은 행사',
        startsAt: new Date(now.getTime() - 30 * MINUTE),
        endsAt: shortEnds,
        place: '302',
        state: 'published',
      },
    ],
    quests: [
      { title: '[UAT] Open', leader: 'B', joinPolicy: 'open', ...going },
      { title: '[UAT] Approval', leader: 'C', joinPolicy: 'approval', ...going },
    ],
    notes: [
      '친구 없음. A와 B의 "친구와 위치 공유" 켜짐.',
      '행사(오늘): [UAT] Event 19:00–21:00 (301동), 파티 [UAT] Open(B)·[UAT] Approval(C).',
      `[UAT] 짧은 행사는 ${clock(shortEnds)}에 끝나요. 마지막 단계(step 12)는 그 뒤에 해요.`,
      'step 11에서 B와 C가 파티를 없앤 뒤: uat.sh risk4-cancel',
    ],
  };
}

function risk5(): Prepared {
  return { ...NOTHING, friends: [['A', 'B']], notes: ['A–B 친구, C는 친구 아님. 파티 없음.'] };
}

export const PREPARATIONS: Record<UatScenario, (days: Days) => Prepared> = { risk1, risk2, risk3, risk4, risk5 };
