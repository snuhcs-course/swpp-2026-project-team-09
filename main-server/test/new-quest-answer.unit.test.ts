/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type NewQuestInput } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type AnswerPerson } from '../src/assistant/gathering/answer-words.js';
import { newQuestAnswer } from '../src/assistant/recruiting/new-quest-answer.js';
import { fitNewQuest } from '../src/assistant/recruiting/new-quest-fit.js';
import { DATE, id, myDay, NOW, placeOf, readExample, travel } from './events-example.js';

// The words of a new recruiting Quest: the design's examples (section 6.3 Together 8 to 11, section 6.4 Recruit 4) and
// the wireframe's words.

beforeAll(() => readExample());

const THURSDAY = '2026-11-19';

const time = (date: string, clock: string): string => `${date}T${clock}:00+09:00`;

const point = (building: string, label = building): object => {
  const { latitude, longitude } = placeOf(id(building));
  return { placeId: id(building), label, latitude, longitude };
};

const plain = (text: string): AnswerLine => [{ text, strong: false }];

const classOn = (date: string, [start, end]: [string, string], building: string): DayItem => ({
  id: `${building} ${start}`,
  name: 'Class',
  start: onDay(date, start),
  end: onDay(date, end),
  placeId: id(building),
  isClass: true,
});

const person = (userId: string, name: string, items: DayItem[]): AnswerPerson => ({
  userId,
  name,
  me: userId === 'me',
  items,
  position: null,
});

const fridayAsker = (): AnswerPerson => person('me', '유상', myDay());
const fridayJieun = (): AnswerPerson => person('jieun', '지은', [classOn(DATE, ['13:00', '13:50'], '38동')]);

interface Asked {
  date: string;
  now: Date;
  // The building, and the words it is called by.
  at: [string, string];
  title: string;
  event: { start: Date; end: Date | null } | null;
  time: string | null;
  people: AnswerPerson[];
  others: AnswerPerson[];
}

function answerOf({
  date,
  now,
  at: [building, words],
  title,
  event,
  time: said,
  people,
  others,
}: Asked): ReturnType<typeof newQuestAnswer> {
  const input: NewQuestInput = {
    kind: 'new-quest',
    date,
    globalEventId: event === null ? null : 'job-fair',
    title: event === null ? title : null,
    placeId: event === null ? id(building) : null,
    time: said,
    people: people.map(({ userId }) => ({ userId, constraints: [] })),
  };
  const planning = fitNewQuest(
    {
      date,
      now,
      placeId: id(building),
      event,
      time: said === null ? null : onDay(date, said),
      people: people.map(({ userId, items }) => ({ userId, items, locationPlaceId: null })),
      others,
    },
    travel,
  );
  const [asker = fridayAsker()] = people;
  const placeId = id(building);
  return newQuestAnswer({
    input,
    now,
    asker,
    people,
    others,
    planning,
    title,
    placeId,
    placeWords: words,
    placeOf,
    event,
  });
}

// Row 4: the job fair in 문화관 from 10:00 to 17:00, asked on Friday at 13:50, alone or with 지은.
const jobFair = (withJieun: boolean): ReturnType<typeof newQuestAnswer> =>
  answerOf({
    date: DATE,
    now: NOW,
    at: ['문화관', '문화관'],
    title: '채용박람회',
    event: { start: onDay(DATE, '10:00'), end: onDay(DATE, '17:00') },
    time: null,
    people: withJieun ? [fridayAsker(), fridayJieun()] : [fridayAsker()],
    others: withJieun ? [] : [fridayJieun()],
  });

describe('Row 4: a new party for the job fair, alone', () => {
  it('meets at 14:00 in 문화관, posted for 4, with the step that leaves at 15:12 for 301동, and offers 지은', () => {
    const { chips, plans, dropped, noPlan } = jobFair(false);

    expect(chips).toEqual([
      { kind: 'origin', text: '24동에서', userId: null },
      { kind: 'until', text: '15:30 수업까지', userId: null },
    ]);
    expect([dropped, noPlan]).toEqual([[], null]);
    expect(plans[0]).toMatchObject({
      id: id('문화관'),
      title: '채용박람회',
      place: point('문화관'),
      startAt: time(DATE, '14:00'),
      endAt: time(DATE, '15:12'),
      togetherMinutes: 72,
      meeting: null,
      parts: [{ userId: 'me', me: true, leaveAt: time(DATE, '13:56'), walkMinutes: 4, leaveBy: time(DATE, '15:12') }],
      subQuests: [{ at: time(DATE, '14:00'), placeId: id('문화관'), title: '15:12까지 채용박람회 · 301동으로 나서기' }],
      lines: [
        [
          { text: '14:00 문화관', strong: true },
          { text: ' · 4명 공개 모집', strong: false },
        ],
        plain('13:54에 도착해서 14:00에 모여요'),
      ],
      candidates: [{ userId: 'jieun', name: '지은', line: '지은 · 13:50 38동 수업 끝' }],
    });
  });
});

// With 지은, who arrives at 14:01: the meeting at 14:10, then the job fair until the asker leaves for 301동.
const withJieun = (): object => ({
  startAt: time(DATE, '14:10'),
  endAt: time(DATE, '15:12'),
  togetherMinutes: 62,
  parts: [
    { userId: 'me', leaveAt: time(DATE, '14:06'), walkMinutes: 4 },
    {
      userId: 'jieun',
      name: '지은',
      me: false,
      origin: { place: point('38동'), basis: 'timetable' },
      leaveAt: time(DATE, '13:59'),
      walkMinutes: 11,
    },
  ],
  subQuests: [
    { at: time(DATE, '14:10'), placeId: id('문화관'), title: '유상, 지은: 문화관 앞에서 만나기' },
    { at: time(DATE, '14:10'), placeId: id('문화관'), title: '15:12까지 채용박람회 · 301동으로 나서기' },
  ],
  lines: [
    [
      { text: '14:10 문화관', strong: true },
      { text: ' · 4명 공개 모집', strong: false },
    ],
    plain('지은이 14:01에 도착해서 14:10에 모여요'),
  ],
  basis: [
    '24동에서 문화관까지 걸어서 4분, 14:06에 나서요',
    '지은 · 38동에서 문화관까지 걸어서 11분, 13:59에 나서요',
    '15:30 수업이라 15:12엔 나서요',
  ],
  band: { startAt: time(DATE, '14:10'), endAt: time(DATE, '15:12'), text: '14:10–15:12 · 62분' },
  candidates: [],
});

describe('Row 4: a new party for the job fair, with 지은', () => {
  it('meets at 14:10, as 지은 arrives at 14:01, with the meeting step first', () => {
    const { chips, plans } = jobFair(true);

    expect(chips).toContainEqual({ kind: 'person', text: '지은', userId: 'jieun' });
    expect(plans[0]).toMatchObject(withJieun());
    expect(plans[0]?.scene.people.map(({ userId, tag }) => [userId, tag])).toEqual([
      ['me', '나 · 4분'],
      ['jieun', '지은 · 11분'],
    ]);
    expect(plans[0]?.band.lanes.map(({ name }) => name)).toEqual(['나', '지은']);
  });
});

// The concert in 두레문예관 at 18:00 with no end, asked on Friday at 13:50: the party meets as the concert starts.
const concert = (jieunToo: boolean): ReturnType<typeof newQuestAnswer> =>
  answerOf({
    date: DATE,
    now: NOW,
    at: ['두레문예관', '두레문예관'],
    title: '동아리 정기공연',
    event: { start: onDay(DATE, '18:00'), end: null },
    time: null,
    people: jieunToo ? [fridayAsker(), fridayJieun()] : [fridayAsker()],
    others: [],
  });

// Partitions: a party alone, and one with 지은, from the concert's own start. Expected values: the Quest's attending Sub
// Quest is the concert itself, so the Plan repeats no step of it (smoke test of 2026-11-16, row 14).
describe("A new party from the event's own start", () => {
  it('alone, has no step of its own: the attending Sub Quest is the concert', () => {
    const [plan] = concert(false).plans;

    expect(plan?.startAt).toBe(time(DATE, '18:00'));
    expect(plan?.subQuests).toEqual([]);
  });

  it('with 지은, has the meeting step only', () => {
    const [plan] = concert(true).plans;

    expect(plan?.subQuests).toEqual([
      { at: time(DATE, '18:00'), placeId: id('두레문예관'), title: '유상, 지은: 두레문예관 앞에서 만나기' },
    ]);
  });
});

describe('Row 5: a new badminton party with 서준', () => {
  it('meets at 17:10 at the gymnasium, one step there, the asker by shuttle', () => {
    const { plans } = answerOf({
      date: THURSDAY,
      now: onDay(THURSDAY, '16:45'),
      at: ['체육관', '체육관'],
      title: '배드민턴',
      event: null,
      time: null,
      people: [
        person('me', '유상', [classOn(THURSDAY, ['15:30', '16:45'], '301동')]),
        person('seojun', '서준', [classOn(THURSDAY, ['15:30', '16:45'], '24동')]),
      ],
      others: [],
    });

    expect(plans[0]).toMatchObject({
      title: '배드민턴',
      startAt: time(THURSDAY, '17:10'),
      parts: [
        { userId: 'me', leaveAt: time(THURSDAY, '16:53'), walkMinutes: 17, mode: 'shuttle' },
        { userId: 'seojun', leaveAt: time(THURSDAY, '16:56'), walkMinutes: 14 },
      ],
      subQuests: [
        { at: time(THURSDAY, '17:10'), placeId: id('체육관'), title: '유상, 서준: 체육관 앞에서 만나기' },
        { at: time(THURSDAY, '17:10'), placeId: id('체육관'), title: '배드민턴' },
      ],
      lines: [
        [
          { text: '17:10 체육관', strong: true },
          { text: ' · 4명 공개 모집', strong: false },
        ],
        plain('17:02에 도착해서 17:10에 모여요'),
      ],
      // An activity has no end: "17:10–17:40 · 30분" was a length no one gave.
      band: { text: '17:10부터' },
    });
  });
});

describe('No time everyone can meet', () => {
  it('answers no plan and says so', () => {
    const { plans, noPlan } = answerOf({
      date: DATE,
      now: NOW,
      at: ['301동', '제1공학관'],
      title: '탁구',
      event: null,
      time: '15:40',
      people: [fridayAsker()],
      others: [],
    });

    expect(plans).toEqual([]);
    expect(noPlan).toEqual({ reason: 'no-fit', lines: [plain('그 시간엔 모일 수 없어요')] });
  });
});
