/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type LibraryCardSpace } from '../../src/assistant/library/library-card.js';
import {
  type AnswerReply,
  type GroupRoomKind,
  type Plan,
  type PlanPart,
  type RoomRequestState,
  type StudyGroup,
} from '../../src/assistant/dto/answer.dto.js';
import { KWANJEONG, ME, ORIGIN, OTHER_FRIEND } from './study-answer.js';

// The study answer together (P10, 2026-11-27), as tickets 07 and 08 make it, for the app session's mock: asked on
// Wednesday 2026-11-04 at 19:10, the User and three Friends are all free tomorrow from 15:00, so the plan is a 관정
// 4층 6인실 from 15:00 to 17:00. Four states of it: ready to send ("동의 요청 보내기"), gathering (1 of 3 consents),
// ready (every consent in, "예약하기"), and with two Friends only, one more needed ("+ 같이"). 김지은 has nothing
// before it that day, so where she sets out from is not known. Names, ids and places are examples.

const DAY = '2026-11-05';
const NOW = '2026-11-04T19:10:00+09:00';
const at = (clock: string): string => `${DAY}T${clock}:00+09:00`;

const point = (placeId: string, label: string, latitude: number, longitude: number): Plan['place'] => ({
  placeId,
  label,
  latitude,
  longitude,
});

// Each Friend's Class before it, which they set out from, and their walk to 관정관; 김지은 has none.
const FRIENDS = [
  {
    userId: 'a3f1c2d4-0000-4000-8000-0000000000a1',
    name: '박민수',
    from: point('6f1b2c3d-0000-4000-8000-000000000024', '24동', 37.4566, 126.9493),
    walk: 12,
    free: '14:45',
  },
  {
    userId: 'a3f1c2d4-0000-4000-8000-0000000000a2',
    name: '이서연',
    from: point('6f1b2c3d-0000-4000-8000-000000000083', '83동', 37.4646, 126.9539),
    walk: 15,
    free: '14:45',
  },
  { userId: 'a3f1c2d4-0000-4000-8000-0000000000a3', name: '김지은', from: null, walk: null, free: null },
];

// Each kind's library space as the catalogue gives it (cardSpace()), the one the phone reads the kind's free rooms from.
function spaceOf(
  spaceId: string,
  name: string,
  floor: number,
  sector: [number, number],
  seatNos: number[],
): LibraryCardSpace {
  const [roomNo, sectorNo] = sector;
  return {
    id: spaceId,
    name,
    floor,
    kind: 'group-study-room',
    placeNumber: '62-1',
    unit: 'room',
    roomNo,
    sectorNo,
    seatNos,
    mapImage: null,
    hours: { open: '09:00', close: '23:00' },
    minMinutes: 30,
    maxMinutes: 180,
    stepMinutes: 30,
  };
}

const seats = (sectorNo: number, ...numbers: number[]): number[] => numbers.map((number) => sectorNo * 1000 + number);

const kind = (name: string, capacity: [number, number], space: LibraryCardSpace): GroupRoomKind => ({
  spaceId: space.id,
  floor: space.floor,
  name,
  capacity: { min: capacity[0], max: capacity[1] },
  space,
});

const SIX_FOURTH = kind(
  '6인실',
  [4, 6],
  spaceOf(
    '4F-group-6',
    '그룹스터디룸 6인실 (24 rooms)',
    4,
    [141, 14103],
    seats(14103, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25),
  ),
);

// The kinds the app can request, 2층 first, as the ticket's left cell lists them.
const KINDS = [
  kind('6인실', [4, 6], spaceOf('2F-group-6', '그룹스터디룸 6인실', 2, [121, 12103], seats(12103, 1, 2, 3, 6))),
  kind('10인실', [7, 10], spaceOf('2F-group-10', '그룹스터디룸 10인실', 2, [121, 12102], seats(12102, 1, 2, 3))),
  SIX_FOURTH,
  kind('8인실', [6, 8], spaceOf('4F-group-8', '그룹스터디룸 8인실 (G401)', 4, [141, 14102], seats(14102, 1))),
  kind('10인실', [7, 10], spaceOf('4F-group-10', '그룹스터디룸 10인실', 4, [141, 14101], seats(14101, 1, 2, 3, 4))),
];

function reasonOf({ min, max }: GroupRoomKind['capacity'], people: number): string | null {
  if (people < min) {
    return `${min}명부터`;
  }
  return people > max ? `${max}명까지` : null;
}

const roomsFor = (people: number): StudyGroup['rooms'] =>
  KINDS.map(({ spaceId, floor, name, capacity, space }) => {
    const reason = reasonOf(capacity, people);
    return { spaceId, floor, name, capacity, space, fits: reason === null, reason };
  });

const USE = ['강의', '과제', '동아리활동', '연구', '취업', '기타'];

// "14:57" of 14:45 and 12 minutes.
const later = (clock: string, minutes: number): string => {
  const [hours = 0, rest = 0] = clock.split(':').map(Number);
  const total = hours * 60 + rest + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

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
    ...friends.map(({ userId, name, from, walk }) => ({
      userId,
      name,
      me: false,
      origin: from === null ? null : { place: from, basis: 'timetable' as const },
      leaveAt: walk === null ? null : at(later('14:00', 60 - walk)),
      walkMinutes: walk,
      arriveAt: at('15:00'),
      leaveBy: null,
      next: null,
    })),
  ];
}

// When each comes: after their Class and the walk, or for the start.
const notesOf = (friends: typeof FRIENDS): string[] => [
  '나 14:59 도착',
  ...friends.map(({ name, free, walk }) =>
    free === null || walk === null ? `${name} 15:00부터` : `${name} ${later(free, walk)} 도착`,
  ),
];

const scenePeople = (friends: typeof FRIENDS): Plan['scene']['people'] => [
  { userId: ME, name: '나', me: true, at: ORIGIN, source: 'timetable', tag: '나 · 14분' },
  ...friends.flatMap(({ userId, name, from, walk }) =>
    from === null
      ? []
      : [{ userId, name, me: false, at: from, source: 'timetable' as const, tag: `${name} · ${walk}분` }],
  ),
];

function sceneOf(friends: typeof FRIENDS, tag: string): Plan['scene'] {
  return {
    people: scenePeople(friends),
    places: [{ place: KWANJEONG, role: 'pick', tag }],
    routes: [
      { userId: ME, role: 'me', from: ORIGIN, to: KWANJEONG, minutes: 14 },
      ...friends.flatMap(({ userId, from, walk }) =>
        from === null || walk === null ? [] : [{ userId, role: 'friend' as const, from, to: KWANJEONG, minutes: walk }],
      ),
    ],
    flags: [{ at: KWANJEONG, text: '15:00 공부', role: 'place' }],
  };
}

function bandOf(friends: typeof FRIENDS): Plan['band'] {
  return {
    range: { startAt: at('14:00'), endAt: at('17:30') },
    now: NOW,
    lanes: [
      { userId: ME, name: '나', busy: [{ startAt: at('14:00'), endAt: at('14:45'), label: '301동 수업' }] },
      ...friends.map(({ userId, name, from, free }) => ({
        userId,
        name,
        busy:
          from === null || free === null
            ? []
            : [{ startAt: at('14:00'), endAt: at(free), label: `${from.label} 수업` }],
      })),
    ],
    others: [{ ...OTHER_FRIEND, busy: [], walkMinutes: 9 }],
    startAt: at('15:00'),
    endAt: at('17:00'),
    text: '15:00–17:00 · 2시간',
  };
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
      ...(group.moreNeeded > 0
        ? [[{ text: `4명부터 예약할 수 있어요 · ${group.moreNeeded}명 더`, strong: false }]]
        : []),
    ],
    basis: ['모두가 비는 때: 내일 15:00–17:00', '그룹스터디룸은 4명부터 예약할 수 있어요', ...notesOf(friends)],
    scene: sceneOf(friends, `${group.room.floor}층 그룹스터디룸 · ${people}명`),
    band: bandOf(friends),
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
      together: true,
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
