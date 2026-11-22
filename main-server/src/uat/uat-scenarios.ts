/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { accountOf, type Letter, TESTER_LETTERS, type Tester } from './uat-accounts.js';
import {
  ASKED_QUEST,
  type ClassSpec,
  clock,
  type Days,
  type EventSpec,
  MINUTE,
  type Prepared,
  type QuestSpec,
  UAT_EVENT,
  uatId,
} from './uat-specs.js';

// What the UAT sheet (cycle 2) needs before its first step. The session is prepared once and its scenarios run on in
// the sheet's order, so there is one preparation, not one for each scenario. D0 is the day of the run and D1 the day
// after; every time counts from the run, so a rehearsal on another day prepares the same. What the testers and the
// helpers make in the steps is theirs to make, and is not here.

const BADMINTON = '배드민턴 같이 쳐요. 민턴 초보도 환영!';
const GAP = '공강에 같이 해요.';

type Rest = Omit<QuestSpec, 'id' | 'title' | 'leader' | 'description'>;

function partyOf(leader: Letter, description: string, name: string, title: string, rest: Rest): QuestSpec {
  return { id: uatId(`quest:${name}`), title, leader, description, ...rest };
}

// UAT-4: B's four parties tomorrow evening.
function eveningQuests({ at }: Days): QuestSpec[] {
  const open = { joinPolicy: 'open' as const };
  return [
    partyOf('B', BADMINTON, 'minton-open', '[UAT] 민턴 바로', {
      ...open,
      capacity: 10,
      startsAt: at(1, '19:20'),
      place: '301',
      members: ['C'],
    }),
    partyOf('B', BADMINTON, 'minton-approval', '[UAT] 민턴 승인', {
      joinPolicy: 'approval',
      capacity: 2,
      startsAt: at(1, '18:50'),
      place: '302',
    }),
    partyOf('B', BADMINTON, 'minton-full', '[UAT] 민턴 마감', {
      ...open,
      capacity: 1,
      startsAt: at(1, '19:10'),
      place: '301',
    }),
    partyOf('B', BADMINTON, 'minton-private', '[UAT] 민턴 비공개', {
      capacity: 4,
      startsAt: at(1, '19:00'),
      place: '301',
      members: ['C'],
    }),
  ];
}

function eventOf(
  name: string,
  title: string,
  startsAt: Date,
  endsAt: Date,
  place: string,
  state: EventSpec['state'],
): EventSpec {
  return { id: uatId(`global-event:${name}`), title, startsAt, endsAt, place, state };
}

// UAT-4: three badminton events tomorrow, of which only the published one is found.
function eveningEvents({ at }: Days): EventSpec[] {
  return [
    eventOf('badminton-open', '[UAT] 배드민턴 대회', at(1, '18:00'), at(1, '20:00'), '71', 'published'),
    eventOf('badminton-draft', '[UAT] 배드민턴 예선', at(1, '15:00'), at(1, '17:00'), '71', 'draft'),
    eventOf('badminton-cancelled', '[UAT] 배드민턴 친선전', at(1, '16:00'), at(1, '18:00'), '71', 'cancelled'),
  ];
}

// UAT-5: a tester's two classes tomorrow leave a gap from 11:30 to 13:00.
function classes({ weekday }: Days): ClassSpec[] {
  const tomorrow = weekday(1);
  const lesson = (owner: Letter, courseName: string, startTime: string, endTime: string): ClassSpec => ({
    owner,
    courseName,
    weekday: tomorrow,
    startTime,
    endTime,
    place: '301',
  });
  return [
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
  ];
}

// UAT-5: C's four parties in the gap. All are within C's class, since a party C leads counts C as busy for 30 minutes
// from its start.
function gapQuests({ at }: Days): QuestSpec[] {
  const open = { joinPolicy: 'open' as const };
  return [
    partyOf('C', GAP, 'gap-open', '[UAT] 공강 파티', { ...open, capacity: 6, startsAt: at(1, '12:00'), place: '302' }),
    partyOf('C', GAP, 'gap-full', '[UAT] 공강 마감', { ...open, capacity: 1, startsAt: at(1, '12:10'), place: '302' }),
    {
      ...partyOf('C', GAP, 'gap-asked', '[UAT] 공강 신청함', {
        joinPolicy: 'approval',
        capacity: 6,
        startsAt: at(1, '11:40'),
        place: '302',
        asked: [...TESTER_LETTERS],
      }),
      id: ASKED_QUEST,
    },
    partyOf('C', GAP, 'gap-no-place', '[UAT] 공강 장소없음', {
      ...open,
      capacity: 6,
      startsAt: at(1, '11:50'),
      placeLabel: '우리 동아리방',
    }),
  ];
}

// UAT-5: in the building of 수업2 the way takes no time and the app arrives a minute early, so one leaves by 12:59: a
// stay of 30 minutes from 12:29 and of 29 from 12:30.
function gapEvents({ at }: Days): EventSpec[] {
  return [
    eventOf('gap-30', '[UAT] 공강 행사 30분', at(1, '12:29'), at(1, '13:30'), '301', 'published'),
    eventOf('gap-29', '[UAT] 공강 행사 29분', at(1, '12:30'), at(1, '13:30'), '301', 'published'),
  ];
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

interface Today {
  quests: QuestSpec[];
  events: EventSpec[];
  shortEnds: Date;
  eventStarts: Date;
}

// UAT-1: today's event with its two parties, and an event that ends during the session. Their times count from the
// run and not from the clock, so a rehearsal at any hour finds the first ahead and the second over within half an hour.
function today(days: Days): Today {
  const from = (minutes: number): Date => new Date(days.now.getTime() + minutes * MINUTE);
  const [eventStarts, shortEnds] = [from(75), from(30)];
  const going = { capacity: 6, globalEventId: UAT_EVENT };
  return {
    eventStarts,
    shortEnds,
    events: [
      { ...eventOf('event', '[UAT] Event', eventStarts, from(5 * 60), '301', 'published'), id: UAT_EVENT },
      eventOf('short', '[UAT] 짧은 행사', from(-30), shortEnds, '302', 'published'),
    ],
    quests: [
      partyOf('D', '같이 가요.', 'event-open', '[UAT] Open', { ...going, joinPolicy: 'open' }),
      partyOf('B', '같이 가요.', 'event-approval', '[UAT] Approval', { ...going, joinPolicy: 'approval' }),
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
  return classes(days).filter(({ owner }) => owner === tester);
}

export function prepared(days: Days): Prepared {
  const uat1 = today(days);
  return {
    friends: [...TESTER_LETTERS.flatMap((tester) => friendsOf(tester)), ['B', 'C']],
    // B and D show themselves from the start; a tester turns the switch on in UAT-3.
    masterSwitchOn: ['B', 'D'],
    events: [...eveningEvents(days), ...gapEvents(days), ...uat1.events],
    quests: [...eveningQuests(days), ...gapQuests(days), ...uat1.quests],
    classes: classes(days),
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
