/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions, per check of a Party, class, Place or walking route: the documented shape, and each checked field left
// out, mistyped and null, which only nullable fields take. Expected values: main-server's README, Party to Timetable.

import { inList, inside, omit, type Variant, wrongFields } from '../support/answer-variants';
import {
  type Guard,
  isCampusPlace,
  isMyParty,
  isParties,
  isPlaces,
  isTimetableClass,
  isTimetableClasses,
  isWalkingRoute,
} from '@/api/server/answers';

function checks<Answer>(guard: Guard<Answer>, accepted: readonly Variant[], refused: readonly Variant[]): void {
  it.each(accepted)('%s → accepted', (_, answer) => {
    expect(guard(answer)).toBe(true);
  });
  it.each(refused)('%s → refused', (_, answer) => {
    expect(guard(answer)).toBe(false);
  });
}

const EVENT_NAME = { id: 'e1', title: '지능형통신 연합전공 설명회' };
const PARTY_QUEST = { id: 'q1', title: '지능형통신 연합전공 설명회', globalEvent: EVENT_NAME };
const PARTY = {
  id: 'p1',
  title: '설명회 같이',
  memberCount: 2,
  capacity: 4,
  joinPolicy: 'approval',
  quest: PARTY_QUEST,
  leader: { id: 'u1', name: '홍길동' },
  holdsQuest: false,
  friends: [{ id: 'u2', name: '김철수', department: '경영학과' }],
};
const MEMBER = { id: 'u1', name: '홍길동', department: '컴퓨터공학부', leader: true, visible: true };
const MY_PARTY = {
  id: 'p1',
  title: '설명회 같이',
  capacity: 4,
  joinPolicy: 'open',
  quest: PARTY_QUEST,
  sharing: true,
  members: [MEMBER, { id: 'u2', name: '김철수', department: '경영학과', leader: false, visible: false }],
};
const TIME = { id: 't1', weekday: 'monday', startTime: '10:00', endTime: '11:15', placeId: 'pl1', room: '101호' };
const CLASS = {
  id: 'c1',
  courseName: '컴파일러',
  times: [TIME, { ...TIME, id: 't2', weekday: 'wednesday', placeId: null, room: null }],
  overlaps: [{ id: 'c2', courseName: '데이터베이스' }],
};
const CAMPUS_PLACE = { id: 'pl1', number: '1', name: '인문관1', latitude: 37.46027, longitude: 126.95234 };
const ROUTE = {
  line: [
    { latitude: 37.46632762, longitude: 126.94829436 },
    { latitude: 37.46608837, longitude: 126.94838354 },
  ],
  distance: 1105,
  duration: 1216,
};
const WALK = { status: 'OK', route: ROUTE };

describe('isParties', () => {
  checks(
    isParties,
    [
      ['the Parties the User can see', [PARTY]],
      ['no Party', []],
      ['a Party tied to no Quest', [{ ...PARTY, quest: null }]],
      ['a Party whose Quest has no Global Event', [{ ...PARTY, quest: { ...PARTY_QUEST, globalEvent: null } }]],
    ],
    inList(PARTY, [
      ...wrongFields(
        PARTY,
        {
          id: [1],
          title: [1],
          memberCount: ['2'],
          capacity: ['4'],
          joinPolicy: ['public'],
          quest: ['설명회'],
          holdsQuest: ['false'],
          friends: ['김철수', [{ id: 'u2' }]],
        },
        ['quest'],
      ),
      ['no Leader', omit(PARTY, 'leader')],
      ['leader null', { ...PARTY, leader: null }],
      ['a Leader without a name', { ...PARTY, leader: { id: 'u1' } }],
      ...inside(
        PARTY,
        'quest',
        wrongFields(PARTY_QUEST, { id: [1], title: [1], globalEvent: ['설명회'] }, ['globalEvent']),
      ),
    ]),
  );
});

describe('isMyParty', () => {
  checks(
    isMyParty,
    [
      ["the User's Party", MY_PARTY],
      ['a Party tied to no Quest', { ...MY_PARTY, quest: null }],
    ],
    [
      ...wrongFields(
        MY_PARTY,
        {
          id: [1],
          title: [1],
          capacity: ['4'],
          joinPolicy: ['public'],
          quest: ['설명회'],
          sharing: ['true'],
          members: ['홍길동'],
        },
        ['quest'],
      ),
      ...inside(
        MY_PARTY,
        'members',
        inList(
          MEMBER,
          wrongFields(MEMBER, { id: [1], name: [1], department: [1], leader: ['true'], visible: ['true'] }),
        ),
      ),
    ],
  );
});

describe('isTimetableClass', () => {
  checks(
    isTimetableClass,
    [
      ['a class with a time at a Place and one at none', CLASS],
      ...['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((weekday): Variant => [
        `a time on ${weekday}`,
        { ...CLASS, times: [{ ...TIME, weekday }] },
      ]),
    ],
    [
      ...wrongFields(CLASS, { id: [1], courseName: [1], times: ['월 10:00'], overlaps: ['데이터베이스'] }),
      ...inside(
        CLASS,
        'times',
        inList(
          TIME,
          wrongFields(TIME, { id: [1], weekday: ['mon', 1], startTime: [1], endTime: [1], placeId: [1], room: [1] }, [
            'placeId',
            'room',
          ]),
        ),
      ),
      ['an overlap without its courseName', { ...CLASS, overlaps: [{ id: 'c2' }] }],
    ],
  );
});

describe('isTimetableClasses', () => {
  checks(
    isTimetableClasses,
    [
      ['the classes', [CLASS]],
      ['no class', []],
    ],
    [['an item with no times', [CLASS, omit(CLASS, 'times')]]],
  );
});

describe('isCampusPlace', () => {
  checks(
    isCampusPlace,
    [
      ['a Place with a number', CAMPUS_PLACE],
      ['a Place without a number, null', { ...CAMPUS_PLACE, number: null, name: '자하연' }],
    ],
    wrongFields(CAMPUS_PLACE, { id: [1], number: [1], name: [1], latitude: ['37.46027'], longitude: ['126.95234'] }, [
      'number',
    ]),
  );
});

describe('isPlaces', () => {
  checks(
    isPlaces,
    [
      ['the Places', [CAMPUS_PLACE]],
      ['none found, []', []],
    ],
    [['an item with no name', [CAMPUS_PLACE, omit(CAMPUS_PLACE, 'name')]]],
  );
});

describe('isWalkingRoute', () => {
  checks(
    isWalkingRoute,
    [
      ["Kakao's walk", WALK],
      ...[
        'SAME_POINT',
        'START_LINK_NOT_FOUND',
        'END_LINK_NOT_FOUND',
        'TOO_MANY_SEARCH_LINK',
        'TOO_FAR_AWAY',
        'ROUTE_RESULT_NOT_FOUND',
      ].map((status): Variant => [`no route: ${status}`, { status, route: null }]),
    ],
    [
      ['OK without a route', { status: 'OK', route: null }],
      ['no route with a route', { status: 'SAME_POINT', route: ROUTE }],
      ["a status that is not Kakao's", { status: 'ZERO_RESULTS', route: null }],
      ['no status', { route: null }],
      ...inside(
        WALK,
        'route',
        wrongFields(ROUTE, {
          line: ['37.466,126.948', [{ latitude: 37.46632762 }]],
          distance: ['1105'],
          duration: ['1216'],
        }),
      ),
    ],
  );
});
