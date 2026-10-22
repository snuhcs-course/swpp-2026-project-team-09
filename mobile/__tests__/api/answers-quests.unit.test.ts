/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions, for each check of an answer about Quests: the documented shape, each checked field left out, null and of
// another type, and null where it is allowed. Expected values: main-server's README (Quests) and GLOSSARY (Sub Quest).

import { omit, type Variant, wrongFields } from '../support/answer-variants';
import {
  type Guard,
  isBoard,
  isEventName,
  isHolder,
  isJoinPolicy,
  isPlace,
  isQuest,
  isQuests,
  isSubQuest,
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
const POINT = {
  placeId: null,
  label: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
  latitude: 37.45487,
  longitude: 126.95407,
};
const SUB_QUEST = {
  id: 's1',
  attending: true,
  title: '지능형통신 연합전공 설명회',
  startsAt: '2026-10-13T08:00:00.000Z',
  endsAt: null,
  place: POINT,
  completion: 'by_hand',
  cancelled: false,
  done: false,
  ended: false,
};
const HOLDER = { id: 'u1', name: '홍길동', department: '컴퓨터공학부' };
const QUEST = {
  id: 'q1',
  title: '지능형통신 연합전공 설명회',
  globalEvent: EVENT_NAME,
  leader: HOLDER,
  capacity: 4,
  joinPolicy: 'closed',
  board: null,
  description: '',
  createdAt: '2026-10-06T08:00:00.000Z',
  holders: [HOLDER],
  subQuests: [SUB_QUEST],
  classQuest: false,
  waitingJoinRequests: 0,
};

describe('isEventName', () => {
  checks(
    isEventName,
    [
      ["a Quest's Global Event", EVENT_NAME],
      ['no Global Event, null', null],
    ],
    wrongFields(EVENT_NAME, { id: [1], title: [1] }),
  );
});

describe('isPlace', () => {
  checks(
    isPlace,
    [
      ['a point on the map with its label', POINT],
      ['a Place of the list', { ...POINT, placeId: 'pl1', label: '제1공학관' }],
      ['only the words the User wrote', { ...POINT, latitude: null, longitude: null }],
      ['no place, null', null],
    ],
    wrongFields(POINT, { placeId: [1], label: [1], latitude: ['37.45487'], longitude: ['126.95407'] }, ['placeId']),
  );
});

describe('isSubQuest', () => {
  checks(
    isSubQuest,
    [
      ['the attending Sub Quest', SUB_QUEST],
      [
        'one ended by time, without a start',
        { ...SUB_QUEST, startsAt: null, endsAt: '2026-10-13T09:00:00.000Z', completion: 'by_time' },
      ],
      ['one without a place', { ...SUB_QUEST, place: null }],
    ],
    wrongFields(
      SUB_QUEST,
      {
        id: [1],
        title: [1],
        startsAt: [1],
        endsAt: [1],
        place: ['132동'],
        completion: ['by_place'],
        attending: ['true'],
        cancelled: ['false'],
        done: ['false'],
        ended: ['false'],
      },
      ['startsAt', 'endsAt', 'place'],
    ),
  );
});

describe('isHolder', () => {
  checks(isHolder, [['a Holder', HOLDER]], wrongFields(HOLDER, { id: [1], name: [1], department: [1] }));
});

describe('isJoinPolicy', () => {
  checks(
    isJoinPolicy,
    ['open', 'approval', 'closed'].map((policy): Variant => [policy, policy]),
    [
      ['public', 'public'],
      ['null', null],
    ],
  );
});

describe('isBoard', () => {
  checks(
    isBoard,
    [...['meal', 'career', 'hobby', 'show'].map((board): Variant => [board, board]), ['no Board, null', null]],
    [
      ['study', 'study'],
      ['1', 1],
    ],
  );
});

describe('isQuest', () => {
  checks(
    isQuest,
    [
      ['a Closed Quest for a Global Event', QUEST],
      [
        'an Open Quest on a Board',
        { ...QUEST, globalEvent: null, joinPolicy: 'open', board: 'meal', description: '학관' },
      ],
      ['a Class Quest', { ...QUEST, globalEvent: null, leader: null, createdAt: null, classQuest: true }],
    ],
    wrongFields(
      QUEST,
      {
        id: [1],
        title: [1],
        globalEvent: ['설명회'],
        leader: [{ id: 'u1' }],
        capacity: ['4'],
        joinPolicy: ['public'],
        board: ['study'],
        description: [1],
        createdAt: [1],
        holders: ['홍길동', [{ id: 'u1' }]],
        subQuests: [[omit(SUB_QUEST, 'completion')]],
        classQuest: ['false'],
        waitingJoinRequests: ['0'],
      },
      ['globalEvent', 'leader', 'board', 'createdAt'],
    ),
  );
});

describe('isQuests', () => {
  checks(
    isQuests,
    [
      ["the User's Quests", [QUEST]],
      ['no Quest', []],
    ],
    [
      ['one Quest outside a list', QUEST],
      ['an item with no waitingJoinRequests', [QUEST, omit(QUEST, 'waitingJoinRequests')]],
    ],
  );
});
