/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerReply,
  type GroupRoomKind,
  type Plan,
  type PlanPart,
  type RoomRequestState,
  type StudyGroup,
} from '../../src/assistant/dto/answer.dto.js';
import { KWANJEONG, ME, ORIGIN } from './study-answer.js';

// The study answer with Friends (P10, 2026-11-27), as tickets 07 and 08 make it, for the app session's mock: asked on
// Wednesday 2026-11-04 at 19:10, the User and three Friends are all free tomorrow from 15:00, so the plan is a 관정
// 4층 6인실 from 15:00 to 17:00. Four states of it: ready to send ("동의 요청 보내기"), gathering (1 of 3 consents),
// ready (every consent in, "예약하기"), and with two Friends only, one more needed ("+ 같이"). Names, ids and places are
// examples.

const DAY = '2026-11-05';
const NOW = '2026-11-04T19:10:00+09:00';
const at = (clock: string): string => `${DAY}T${clock}:00+09:00`;

const FRIENDS = [
  { userId: 'a3f1c2d4-0000-4000-8000-0000000000a1', name: '박민수', from: '24동', walk: 12, free: '14:50' },
  { userId: 'a3f1c2d4-0000-4000-8000-0000000000a2', name: '이서연', from: '83동', walk: 15, free: '14:45' },
  { userId: 'a3f1c2d4-0000-4000-8000-0000000000a3', name: '김지은', from: '62-1동', walk: 0, free: '15:00' },
];

const kind = (spaceId: string, floor: number, name: string, min: number, max: number): GroupRoomKind => ({
  spaceId,
  floor,
  name,
  capacity: { min, max },
});

const SIX_FOURTH = kind('4F-group-6', 4, '6인실', 4, 6);

// The kinds the app can request, 2층 first, as the ticket's left cell lists them.
const KINDS = [
  kind('2F-group-6', 2, '6인실', 4, 6),
  kind('2F-group-10', 2, '10인실', 7, 10),
  SIX_FOURTH,
  kind('4F-group-8', 4, '8인실', 6, 8),
  kind('4F-group-10', 4, '10인실', 7, 10),
];

const roomsFor = (people: number): StudyGroup['rooms'] =>
  KINDS.map(({ spaceId, floor, name, capacity }) => {
    const fits = capacity.min <= people && people <= capacity.max;
    return { spaceId, floor, name, capacity, fits, reason: fits ? null : `${capacity.min}명부터` };
  });

const USE = ['강의', '과제', '동아리활동', '연구', '취업', '기타'];

function partsOf(friends: typeof FRIENDS): PlanPart[] {
  const me: PlanPart = {
    userId: ME,
    name: '나',
    me: true,
    origin: { place: ORIGIN, basis: 'timetable' },
    leaveAt: at('14:46'),
    walkMinutes: 14,
    arriveAt: at('15:00'),
    leaveBy: null,
    next: null,
  };
  return [
    me,
    ...friends.map(({ userId, name, walk }) => ({
      userId,
      name,
      me: false,
      origin: null,
      leaveAt: null,
      walkMinutes: walk,
      arriveAt: at('15:00'),
      leaveBy: null,
      next: null,
    })),
  ];
}

function groupPlan(friends: typeof FRIENDS, group: StudyGroup): Plan {
  const people = friends.length + 1;
  return {
    id: '관정관',
    title: '관정관에서 같이 공부',
    place: KWANJEONG,
    startAt: at('15:00'),
    endAt: at('17:00'),
    togetherMinutes: 120,
    meeting: null,
    parts: partsOf(friends),
    subQuests: [],
    lines: [
      [
        { text: `그룹스터디룸 ${group.room.floor}층 ${group.room.name}`, strong: true },
        { text: ` · ${people}명`, strong: false },
      ],
    ],
    basis: ['모두가 비는 때: 내일 15:00–17:00', '그룹스터디룸은 4명부터 예약할 수 있어요'],
    scene: {
      people: [],
      places: [{ place: KWANJEONG, role: 'pick', tag: `${group.room.floor}층 그룹스터디룸 · ${people}명` }],
      routes: [{ userId: ME, role: 'me', from: ORIGIN, to: KWANJEONG, minutes: 14 }],
      flags: [{ at: KWANJEONG, text: '15:00 공부', role: 'place' }],
    },
    band: {
      range: { startAt: at('14:00'), endAt: at('17:30') },
      now: NOW,
      lanes: [
        { userId: ME, name: '나', busy: [{ startAt: at('14:00'), endAt: at('14:45'), label: '301동 수업' }] },
        ...friends.map(({ userId, name, free }) => ({
          userId,
          name,
          busy: free === '15:00' ? [] : [{ startAt: at('14:00'), endAt: at(free), label: '수업' }],
        })),
      ],
      others: [{ userId: 'a3f1c2d4-0000-4000-8000-0000000000a4', name: '최준호', busy: [], walkMinutes: 9 }],
      startAt: at('15:00'),
      endAt: at('17:00'),
      text: '15:00–17:00 · 2시간',
    },
    study: { spaces: [], book: null, liveSeats: 'kwanjeong', group },
  };
}

function groupAnswer(friends: typeof FRIENDS, request: RoomRequestState | null): AnswerReply {
  const people = friends.length + 1;
  const moreNeeded = Math.max(0, 4 - people);
  const group: StudyGroup = {
    room: SIX_FOURTH,
    rooms: roomsFor(people),
    people,
    moreNeeded,
    key: moreNeeded > 0 ? null : `book:4F-group-6:${DAY}:1500:120`,
    useDescOptions: USE,
    opens: null,
    request,
  };
  return {
    input: {
      kind: 'study',
      date: DAY,
      what: 'any',
      people: [ME, ...friends.map(({ userId }) => userId)].map((userId) => ({ userId, constraints: [] })),
      window: { from: null, until: null },
      area: null,
      minutes: 120,
      chosen: { seatSpaceId: null, roomSpaceId: null },
    },
    chips: friends.map(({ userId, name }) => ({ kind: 'person' as const, text: name, userId })),
    plans: [groupPlan(friends, group)],
    dropped: [],
    closed: [],
    noPlan: null,
    choosable: true,
  };
}

const REQUEST_ID = 'c0ffee00-0000-4000-8000-000000000001';

// Four people, nothing sent yet: "동의 요청 보내기".
export const STUDY_GROUP_TO_SEND = groupAnswer(FRIENDS, null);

// Sent, and 김지은 has consented: "동의 1/3 · 박민수, 이서연 님을 기다려요", the button dimmed.
export const STUDY_GROUP_GATHERING = groupAnswer(FRIENDS, {
  id: REQUEST_ID,
  status: 'gathering',
  consented: 1,
  asked: 3,
  waiting: ['박민수', '이서연'],
  moreNeeded: 0,
});

// Every consent in, after the push room-agreed: "모두 동의했어요", "예약하기".
export const STUDY_GROUP_READY = groupAnswer(FRIENDS, {
  id: REQUEST_ID,
  status: 'ready',
  consented: 3,
  asked: 3,
  waiting: [],
  moreNeeded: 0,
});

// Three people: "그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요.", "+ 같이", no key.
export const STUDY_GROUP_MORE_NEEDED = groupAnswer(FRIENDS.slice(0, 2), null);
