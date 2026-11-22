/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { v5 as uuidv5 } from 'uuid';
import { koreaDate } from '../assistant/korea-time.js';
import { QuestBoard, Weekday } from '../generated/prisma/client.js';
import { accountOf, type Letter, TESTER_LETTERS, type Tester } from './uat-accounts.js';

// What the UAT sheet (cycle 2) needs before its first step. The session is prepared once and its scenarios run on in
// the sheet's order, so there is one preparation, not one for each scenario. D0 is the day of the run and D1 the day
// after; every time counts from the run, so a rehearsal on another day prepares the same. What the testers and the
// helpers make in the steps is theirs to make, and is not here.

const ID_NAMESPACE = '5b0f6a8e-7c1d-4e7e-9b53-4d3f0c2a9a11';

// The same id in every database and every run.
export function uatId(name: string): string {
  return uuidv5(`uat:${name}`, ID_NAMESPACE);
}

// "[UAT] Event", which `s2-cancel` cancels where the sheet has it cancelled.
export const UAT_EVENT = uatId('global-event:event');
// "[UAT] 공강 신청함", which every tester has asked to join.
export const ASKED_QUEST = uatId('quest:gap-asked');

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
  // The day `offset` days after today, as "2026-11-23".
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
export function clock(at: Date): string {
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
  id: string;
  title: string;
  leader: Letter;
  // Private when left out: a Closed Quest on no Board.
  joinPolicy?: 'open' | 'approval';
  // 취미 when left out.
  board?: QuestBoard;
  capacity: number;
  description: string;
  // A Quest of its own has a start and no end, as one posted in the app has.
  startsAt?: Date;
  // The campus map's number, or words that name no Place.
  place?: string;
  placeLabel?: string;
  // The Global Event the Quest goes to, in place of a time and a Place of its own.
  globalEventId?: string;
  // Holders besides the Leader, and Users whose request to join waits.
  members?: Letter[];
  asked?: Letter[];
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
  friends: [Letter, Letter][];
  masterSwitchOn: Letter[];
  events: EventSpec[];
  quests: QuestSpec[];
  classes: ClassSpec[];
  // The day that must have lunch menus, as "2026-11-24".
  lunchDay: string;
  // What the host reads or checks before the session, in Korean.
  notes: string[];
}

// The Places the data stands on, by the campus map's number.
export const PLACE_NUMBERS = ['301', '302', '71'];

const BADMINTON = '배드민턴 같이 쳐요. 민턴 초보도 환영!';
const GAP = '공강에 같이 해요.';

// UAT-4: B's four parties tomorrow evening, and three badminton events.
function evening({ at }: Days): { quests: QuestSpec[]; events: EventSpec[] } {
  const party = (name: string, title: string, rest: Omit<QuestSpec, 'id' | 'title' | 'leader' | 'description'>) => ({
    id: uatId(`quest:${name}`),
    title,
    leader: 'B' as const,
    description: BADMINTON,
    ...rest,
  });
  const event = (name: string, title: string, start: string, end: string, state: EventSpec['state']) => ({
    id: uatId(`global-event:${name}`),
    title,
    startsAt: at(1, start),
    endsAt: at(1, end),
    place: '71',
    state,
  });
  return {
    quests: [
      party('minton-open', '[UAT] 민턴 바로', {
        joinPolicy: 'open',
        capacity: 10,
        startsAt: at(1, '19:20'),
        place: '301',
        members: ['C'],
      }),
      party('minton-approval', '[UAT] 민턴 승인', {
        joinPolicy: 'approval',
        capacity: 2,
        startsAt: at(1, '18:50'),
        place: '302',
      }),
      party('minton-full', '[UAT] 민턴 마감', { joinPolicy: 'open', capacity: 1, startsAt: at(1, '19:10'), place: '301' }),
      party('minton-private', '[UAT] 민턴 비공개', { capacity: 4, startsAt: at(1, '19:00'), place: '301', members: ['C'] }),
    ],
    events: [
      event('badminton-open', '[UAT] 배드민턴 대회', '18:00', '20:00', 'published'),
      event('badminton-draft', '[UAT] 배드민턴 예선', '15:00', '17:00', 'draft'),
      event('badminton-cancelled', '[UAT] 배드민턴 친선전', '16:00', '18:00', 'cancelled'),
    ],
  };
}

// UAT-5: the gap between a tester's two classes tomorrow, 11:30 to 13:00, with what fits it and what does not.
function gap({ at, weekday }: Days): { quests: QuestSpec[]; events: EventSpec[]; classes: ClassSpec[] } {
  const tomorrow = weekday(1);
  const lesson = (owner: Letter, courseName: string, startTime: string, endTime: string): ClassSpec => ({
    owner,
    courseName,
    weekday: tomorrow,
    startTime,
    endTime,
    place: '301',
  });
  const party = (name: string, title: string, rest: Omit<QuestSpec, 'id' | 'title' | 'leader' | 'description'>) => ({
    id: uatId(`quest:${name}`),
    title,
    leader: 'C' as const,
    description: GAP,
    ...rest,
  });
  return {
    classes: [
      ...TESTER_LETTERS.flatMap((tester) => [
        lesson(tester, '[UAT] 수업1', '10:00', '11:30'),
        lesson(tester, '[UAT] 수업2', '13:00', '14:30'),
      ]),
      // C shares 10 minutes of the gap and E 15: the least a meal takes is 15.
      lesson('C', '[UAT] C 수업', '11:00', '12:50'),
      lesson('E', '[UAT] E 수업', '11:00', '12:45'),
      // None of the three is free for a new party in the evening, so no Friend is added to a tester's Plan.
      lesson('B', '[UAT] B 저녁', '18:00', '22:00'),
      lesson('C', '[UAT] C 저녁', '18:00', '22:00'),
      lesson('E', '[UAT] E 저녁', '18:00', '22:00'),
    ],
    // All within C's class, since a party C leads counts C as busy for 30 minutes from its start.
    quests: [
      party('gap-open', '[UAT] 공강 파티', { joinPolicy: 'open', capacity: 6, startsAt: at(1, '12:00'), place: '302' }),
      party('gap-full', '[UAT] 공강 마감', { joinPolicy: 'open', capacity: 1, startsAt: at(1, '12:10'), place: '302' }),
      {
        ...party('gap-asked', '[UAT] 공강 신청함', {
          joinPolicy: 'approval',
          capacity: 6,
          startsAt: at(1, '11:40'),
          place: '302',
          asked: [...TESTER_LETTERS],
        }),
        id: ASKED_QUEST,
      },
      party('gap-no-place', '[UAT] 공강 장소없음', {
        joinPolicy: 'open',
        capacity: 6,
        startsAt: at(1, '11:50'),
        placeLabel: '우리 동아리방',
      }),
    ],
    // In the building of 수업2 the way takes no time and the app arrives a minute early, so one leaves by 12:59: a
    // stay of 30 minutes from 12:29 and of 29 from 12:30.
    events: [
      {
        id: uatId('global-event:gap-30'),
        title: '[UAT] 공강 행사 30분',
        startsAt: at(1, '12:29'),
        endsAt: at(1, '13:30'),
        place: '301',
        state: 'published',
      },
      {
        id: uatId('global-event:gap-29'),
        title: '[UAT] 공강 행사 29분',
        startsAt: at(1, '12:30'),
        endsAt: at(1, '13:30'),
        place: '301',
        state: 'published',
      },
    ],
  };
}

// The party each tester already leads today, which UAT-2 fills and ends.
export function ownQuest(tester: Tester, { at }: Days): QuestSpec {
  return {
    id: uatId(`quest:two:${tester}`),
    title: `[UAT] 2인 파티 · ${accountOf(tester).name}`,
    leader: tester,
    joinPolicy: 'open',
    capacity: 2,
    description: 'UAT 테스트',
    startsAt: at(0, '21:00'),
    place: '301',
  };
}

// UAT-1: today's event with its two parties, and an event that ends during the session. Their times count from the
// run and not from the clock, so a rehearsal at any hour finds the first ahead and the second over within half an hour.
function today(days: Days): { quests: QuestSpec[]; events: EventSpec[]; shortEnds: Date; eventStarts: Date } {
  const from = (minutes: number): Date => new Date(days.now.getTime() + minutes * MINUTE);
  const eventStarts = from(75);
  const shortEnds = from(30);
  return {
    eventStarts,
    shortEnds,
    events: [
      { id: UAT_EVENT, title: '[UAT] Event', startsAt: eventStarts, endsAt: from(5 * 60), place: '301', state: 'published' },
      {
        id: uatId('global-event:short'),
        title: '[UAT] 짧은 행사',
        startsAt: from(-30),
        endsAt: shortEnds,
        place: '302',
        state: 'published',
      },
    ],
    quests: [
      {
        id: uatId('quest:event-open'),
        title: '[UAT] Open',
        leader: 'D',
        joinPolicy: 'open',
        capacity: 6,
        description: '같이 가요.',
        globalEventId: UAT_EVENT,
      },
      {
        id: uatId('quest:event-approval'),
        title: '[UAT] Approval',
        leader: 'B',
        joinPolicy: 'approval',
        capacity: 6,
        description: '같이 가요.',
        globalEventId: UAT_EVENT,
      },
      ...TESTER_LETTERS.map((tester) => ownQuest(tester, days)),
    ],
  };
}

// The Friends a tester starts with. B becomes one in UAT-3.
export function friendsOf(tester: Tester): [Letter, Letter][] {
  return [
    [tester, 'C'],
    [tester, 'E'],
  ];
}

// The classes a tester starts with.
export function classesOf(tester: Tester, days: Days): ClassSpec[] {
  return gap(days).classes.filter(({ owner }) => owner === tester);
}

export function prepared(days: Days): Prepared {
  const uat4 = evening(days);
  const uat5 = gap(days);
  const uat1 = today(days);
  return {
    friends: [...TESTER_LETTERS.flatMap(friendsOf), ['B', 'C']],
    // B and D show themselves from the start; a tester turns the switch on in UAT-3.
    masterSwitchOn: ['B', 'D'],
    events: [...uat4.events, ...uat5.events, ...uat1.events],
    quests: [...uat4.quests, ...uat5.quests, ...uat1.quests],
    classes: uat5.classes,
    lunchDay: days.day(1),
    notes: [
      `오늘(D0) ${days.day(0)}, 내일(D1) ${days.day(1)}.`,
      `[UAT] 짧은 행사는 ${clock(uat1.shortEnds)}에 끝나요. UAT-1 9단계(S2)는 그 뒤에 하세요.`,
      `[UAT] Event는 ${clock(uat1.eventStarts)}에 시작해요 (그 전에 UAT-1 1~8단계).`,
      '테스터(A1~A3)의 친구는 박지호(C)와 윤서아(E)뿐이고, 위치 공유는 꺼져 있어요. 이도현(B)과 한지우(D)는 켜져 있어요.',
      `B의 친구 ID: ${accountOf('B').friendId} · 이름: B ${accountOf('B').name}, C ${accountOf('C').name}, D ${accountOf('D').name}`,
    ],
  };
}
