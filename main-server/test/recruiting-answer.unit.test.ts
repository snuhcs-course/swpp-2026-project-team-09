/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type QuestsInput } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { questAnswer } from '../src/assistant/recruiting/quest-answer.js';
import { type DayQuest, fitQuests } from '../src/assistant/recruiting/quest-fit.js';
import { type RecruitingQuestDto } from '../src/quests/dto/quest.dto.js';
import { DATE, id, myDay, NOW, placeOf, readExample, travel } from './events-example.js';

// The words of an answer of recruiting Quests: the design's examples (section 6.3 Together 5, section 6.4 Join 1 and
// 2) and the wireframe's words.

beforeAll(() => readExample());

const INPUT: QuestsInput = { kind: 'quests', globalEventId: 'job-fair', questIds: null };

const time = (date: string, clock: string): string => `${date}T${clock}:00+09:00`;

const point = (building: string, label = building): object => {
  const { latitude, longitude } = placeOf(id(building));
  return { placeId: id(building), label, latitude, longitude };
};

const plain = (text: string): AnswerLine => [{ text, strong: false }];

// A Quest as the recruiting list gives it.
const listed = (questId: string, title: string): RecruitingQuestDto => ({
  id: questId,
  title,
  globalEvent: null,
  leader: { id: 'leader', name: '하나', department: '컴퓨터공학부' },
  holderCount: 3,
  capacity: 4,
  joinPolicy: 'open',
  board: 'hobby',
  description: '',
  createdAt: time(DATE, '09:00'),
  nextSubQuest: { id: `${questId} step`, attending: false, title, startsAt: null, endsAt: null, place: null },
});

const partyAt = (
  date: string,
  questId: string,
  [clock, building]: [string, string],
  more: Partial<DayQuest> = {},
): DayQuest => ({
  id: questId,
  title: questId,
  steps: [{ start: onDay(date, clock), end: null, placeId: id(building), place: building, cancelled: false }],
  eventEnd: null,
  friendNames: [],
  ...more,
});

function answerOf(quests: DayQuest[], items: DayItem[], now: Date): ReturnType<typeof questAnswer> {
  return questAnswer({
    input: INPUT,
    now,
    asker: { userId: 'me', name: '유상', me: true, items, position: null },
    planning: fitQuests({ quests, itemsOn: () => items, now, locationPlaceId: null }, travel),
    placeOf,
    listed: new Map(quests.map((quest) => [quest.id, listed(quest.id, quest.title)])),
  });
}

// Row 4: Friday 13:50, the job fair's 14:20 party with 민수 and its 13:30 party.
const rowFour = (): ReturnType<typeof questAnswer> =>
  answerOf(
    [
      partyAt(DATE, '13:30 파티', ['13:30', '문화관'], { eventEnd: onDay(DATE, '17:00') }),
      partyAt(DATE, '채용박람회 같이 가요', ['14:20', '문화관'], {
        eventEnd: onDay(DATE, '17:00'),
        friendNames: ['민수'],
      }),
    ],
    myDay(),
    NOW,
  );

describe('Row 4: the job fair’s party with 민수', () => {
  it('says where the asker sets out from and until when, and drops the 13:30 party as started', () => {
    const { input, chips, dropped, noPlan } = rowFour();

    expect(input).toEqual(INPUT);
    expect(chips).toEqual([
      { kind: 'origin', text: '24동에서', userId: null },
      { kind: 'until', text: '15:30 수업까지', userId: null },
    ]);
    expect(dropped).toEqual([{ place: point('문화관'), reason: '13:30 파티 · 이미 시작했어요' }]);
    expect(noPlan).toBeNull();
  });

  it('meets at 14:20 in 문화관, setting out at 14:16, staying until 15:12, with 민수 named', () => {
    expect(rowFour().plans[0]).toMatchObject(partyWithMinsu());
  });
});

// The 14:20 party: the asker walks from 24동, sets out at 14:16, and leaves at 15:12 for the 15:30 Class in 301동.
function partyWithMinsu(): object {
  return {
    id: '채용박람회 같이 가요',
    title: '채용박람회 같이 가요',
    place: point('문화관'),
    startAt: time(DATE, '14:20'),
    endAt: time(DATE, '15:12'),
    togetherMinutes: 52,
    meeting: null,
    parts: [
      {
        userId: 'me',
        name: '유상',
        me: true,
        origin: { place: point('24동'), basis: 'timetable' },
        leaveAt: time(DATE, '14:16'),
        walkMinutes: 4,
        leaveBy: time(DATE, '15:12'),
        next: { startAt: time(DATE, '15:30'), place: point('301동') },
      },
    ],
    subQuests: [],
    lines: [
      [
        { text: '14:20 문화관', strong: true },
        { text: ' 파티에', strong: false },
      ],
      plain('민수가 있어요'),
    ],
    basis: [
      '24동에서 문화관까지 걸어서 4분, 14:16에 나서요',
      '문화관에서 301동까지 걸어서 18분',
      '15:30 수업이라 15:12엔 나서요',
    ],
    scene: { flags: [{ text: '14:20 채용박람회 같이 가요', role: 'place' }] },
    band: { startAt: time(DATE, '14:20'), endAt: time(DATE, '15:12'), text: '14:20–15:12 · 52분' },
    quest: listed('채용박람회 같이 가요', '채용박람회 같이 가요'),
    friendNames: ['민수'],
  };
}

// Row 5: Thursday 16:45, the badminton parties at 17:00 and 18:00 in the gymnasium.
const THURSDAY = '2026-11-19';

const rowFive = (): ReturnType<typeof questAnswer> =>
  answerOf(
    [partyAt(THURSDAY, '17시 배드민턴', ['17:00', '체육관']), partyAt(THURSDAY, '18시 배드민턴', ['18:00', '체육관'])],
    [
      {
        id: '301동',
        name: 'Class',
        start: onDay(THURSDAY, '15:30'),
        end: onDay(THURSDAY, '16:45'),
        placeId: id('301동'),
        isClass: true,
      },
    ],
    onDay(THURSDAY, '16:45'),
  );

describe('Row 5: the badminton parties', () => {
  it('plans the 18:00 party by shuttle, setting out at 17:43, and drops the 17:00 party, reached at 17:02', () => {
    const { chips, plans, dropped } = rowFive();

    expect(chips).toEqual([{ kind: 'origin', text: '301동에서', userId: null }]);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      title: '18시 배드민턴',
      place: point('체육관'),
      startAt: time(THURSDAY, '18:00'),
      endAt: time(THURSDAY, '18:30'),
      parts: [{ leaveAt: time(THURSDAY, '17:43'), walkMinutes: 17, leaveBy: null, next: null, mode: 'shuttle' }],
      lines: [
        [
          { text: '18:00 체육관', strong: true },
          { text: ' · 17:43에 나서요', strong: false },
        ],
      ],
      basis: ['301동에서 체육관까지 셔틀로 17분, 17:43에 나서요'],
      scene: { routes: [{ role: 'me', minutes: 17, mode: 'shuttle' }] },
      friendNames: [],
    });
    expect(dropped).toEqual([{ place: point('체육관'), reason: '17:00 파티는 17:02에야 도착해요' }]);
  });
});

describe('No party to join', () => {
  it('answers no plan and says that no party can be reached', () => {
    const { plans, noPlan } = answerOf([], myDay(), NOW);

    expect(plans).toEqual([]);
    expect(noPlan).toEqual({ reason: 'no-fit', lines: [plain('제시간에 갈 수 있는 파티가 없어요')] });
  });
});

describe('Two Friends among the Holders', () => {
  it('are named together', () => {
    const { plans } = answerOf(
      [partyAt(DATE, '전시 보러 가요', ['14:30', '문화관'], { friendNames: ['민수', '지은'] })],
      myDay(),
      NOW,
    );

    expect(plans[0]?.lines[1]).toEqual(plain('민수, 지은이 있어요'));
  });
});

// In the usage test of 2026-11-21, "18:00 체육관 파티에 지호가 있어요" was a 파티 the next day, gone to a day early.
describe('A 파티 on another day', () => {
  it('carries its day in the line, and leaves the flag to the app, which writes the day beside it', () => {
    // The day after DATE, 2026-11-20.
    const tomorrow = '2026-11-21';
    const { plans } = answerOf(
      [partyAt(tomorrow, '배드민턴', ['18:00', '문화관'], { friendNames: ['지호'] })],
      [],
      NOW,
    );

    expect(plans[0]?.lines[0]).toEqual([
      { text: '내일(토) 18:00 문화관', strong: true },
      { text: ' 파티에', strong: false },
    ]);
    expect(plans[0]?.scene.flags[0]?.text).toBe('18:00 배드민턴');
  });
});
