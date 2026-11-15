/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type EventsInput } from '../src/assistant/dto/answer.dto.js';
import { eventAnswer } from '../src/assistant/events/event-answer.js';
import { type DayEvent, type EventPlanning, fitEvents } from '../src/assistant/events/event-fit.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { at, classAt, DATE, events, id, myDay, NOW, placeOf, readExample, travel } from './events-example.js';

// The words of an answer of events: the design's worked example (section 6.3) and its wireframe's words.

beforeAll(() => readExample());

const INPUT: EventsInput = { kind: 'events', date: DATE, eventIds: null };

const time = (clock: string): string => `${DATE}T${clock}:00+09:00`;

const point = (building: string, label = building): object => {
  const { latitude, longitude } = placeOf(id(building));
  return { placeId: id(building), label, latitude, longitude };
};

const position = (building: string): object => {
  const { latitude, longitude } = placeOf(id(building));
  return { latitude, longitude };
};

const plain = (text: string): AnswerLine => [{ text, strong: false }];

function answerOf(items: DayItem[], dayEvents: DayEvent[], date = DATE): ReturnType<typeof eventAnswer> {
  const planning: EventPlanning = fitEvents(
    { items, date, now: NOW, locationPlaceId: null, events: dayEvents },
    travel,
  );
  return eventAnswer({
    input: { ...INPUT, date },
    now: NOW,
    asker: { userId: 'me', name: '유상', me: true, items, position: null },
    planning,
    placeOf,
  });
}

const workedExample = (): ReturnType<typeof eventAnswer> => answerOf(myDay(), events());

describe('The worked example', () => {
  it('says where the asker sets out from and until when, and drops nothing', () => {
    const { input, chips, dropped, noPlan } = workedExample();

    expect(input).toEqual(INPUT);
    expect(chips).toEqual([
      { kind: 'origin', text: '24동에서', userId: null },
      { kind: 'until', text: '15:30 수업까지', userId: null },
    ]);
    expect(dropped).toEqual([]);
    expect(noPlan).toBeNull();
  });
});

// The map of the job fair: the asker in 24동, the fair, the way there, and the way on to the 15:30 Class.
const jobFairScene = (): object => ({
  people: [{ userId: 'me', name: '유상', me: true, at: position('24동'), source: 'timetable', tag: '나 · 4분' }],
  places: [
    { place: point('문화관'), role: 'pick', tag: '채용박람회' },
    { place: point('301동'), role: 'next', tag: '15:30 수업 · 301동' },
  ],
  routes: [
    { userId: 'me', role: 'me', from: position('24동'), to: position('문화관'), minutes: 4 },
    { userId: 'me', role: 'next', from: position('문화관'), to: position('301동'), minutes: 18 },
  ],
  flags: [{ at: position('문화관'), text: '13:54 채용박람회', role: 'place' }],
});

const jobFairBand = (): object => ({
  range: { startAt: time('13:30'), endAt: time('16:00') },
  now: time('13:50'),
  lanes: [
    {
      userId: 'me',
      name: '나',
      busy: [
        { startAt: time('13:30'), endAt: time('13:50'), label: '24동 수업' },
        { startAt: time('15:30'), endAt: time('16:00'), label: '301동 수업' },
      ],
    },
  ],
  startAt: time('13:54'),
  endAt: time('15:12'),
  text: '13:54–15:12 · 78분',
});

describe('The job fair, first', () => {
  it('arrives at 13:54, stays 78 minutes, and leaves at 15:12 for the 15:30 Class', () => {
    expect(workedExample().plans[0]).toEqual({
      id: 'job-fair',
      title: '채용박람회',
      place: point('문화관'),
      startAt: time('13:54'),
      endAt: time('15:12'),
      togetherMinutes: 78,
      meeting: null,
      parts: [
        {
          userId: 'me',
          name: '유상',
          me: true,
          origin: { place: point('24동'), basis: 'timetable' },
          leaveAt: time('13:50'),
          walkMinutes: 4,
          leaveBy: time('15:12'),
          next: { startAt: time('15:30'), place: point('301동') },
        },
      ],
      subQuests: [],
      lines: [
        [
          { text: '13:54 도착', strong: true },
          { text: ' · 78분 볼 수 있어요', strong: false },
        ],
        plain('15:30 수업이라 15:12엔 나서요'),
      ],
      basis: ['24동에서 문화관까지 걸어서 4분', '문화관에서 301동까지 걸어서 18분'],
      scene: jobFairScene(),
      band: jobFairBand(),
    });
  });
});

describe('The concert, next', () => {
  it('goes from 301동 by shuttle, 18 minutes, setting out at 17:42', () => {
    expect(workedExample().plans[1]).toMatchObject({
      id: 'concert',
      place: point('두레문예관'),
      startAt: time('18:00'),
      endAt: time('18:30'),
      togetherMinutes: 30,
      parts: [{ walkMinutes: 18, leaveAt: time('17:42'), leaveBy: null, next: null, mode: 'shuttle' }],
      lines: [
        [
          { text: '동아리 정기공연', strong: true },
          { text: ' · 18:00 시작', strong: false },
        ],
        plain('17:42에 셔틀로 가요'),
      ],
      basis: ['301동에서 두레문예관까지 셔틀로 18분'],
      scene: {
        routes: [
          {
            userId: 'me',
            role: 'me',
            from: position('301동'),
            to: position('두레문예관'),
            minutes: 18,
            mode: 'shuttle',
          },
        ],
        flags: [{ text: '18:00 동아리 정기공연' }],
      },
      band: { text: '18:00–18:30 · 30분' },
    });
  });
});

describe('The company session, last', () => {
  it('is marked as clashing with the 15:30 Class, 4 minutes on foot', () => {
    const session = workedExample().plans[2];

    expect(session).toMatchObject({
      id: 'company-session',
      startAt: time('16:00'),
      endAt: time('17:00'),
      parts: [{ walkMinutes: 4, leaveAt: time('15:56'), leaveBy: null, next: null }],
      lines: [
        [
          { text: '기업 설명회', strong: true },
          { text: ' · 16:00 문화관', strong: false },
        ],
        plain('15:30 수업과 겹쳐요'),
      ],
      basis: ['24동에서 문화관까지 걸어서 4분'],
      band: { startAt: time('16:00'), endAt: time('17:00'), text: '16:00–17:00 · 수업과 겹쳐요' },
    });
    expect(session?.parts[0]).not.toHaveProperty('mode');
  });
});

const event = (eventId: string, start: string, end: string | null, building = '문화관'): DayEvent => ({
  id: eventId,
  title: eventId,
  start: at(start),
  end: end === null ? null : at(end),
  placeId: id(building),
  place: building,
});

describe('The lines', () => {
  it('of an event that has not started, reached on foot, say when to set out', () => {
    const { plans } = answerOf(myDay(), [event('특강', '14:30', '15:00')]);

    expect(plans[0]?.lines).toEqual([
      [
        { text: '특강', strong: true },
        { text: ' · 14:30 시작', strong: false },
      ],
      plain('14:26에 나서면 돼요'),
    ]);
  });

  it('of an event under way that ends before the asker must leave, have no second line', () => {
    const { plans } = answerOf(myDay(), [event('전시', '10:00', '15:00')]);

    expect(plans[0]?.lines).toEqual([
      [
        { text: '13:54 도착', strong: true },
        { text: ' · 66분 볼 수 있어요', strong: false },
      ],
    ]);
  });

  it('of a clash with a Sub Quest name the 일정', () => {
    const quest: DayItem = { ...classAt('15:30', '16:45', '301동'), isClass: false };
    const { plans } = answerOf([classAt('13:00', '13:50', '24동'), quest], [event('설명회', '16:00', '17:00')]);

    expect(plans[0]?.lines[1]).toEqual(plain('15:30 일정과 겹쳐요'));
    expect(plans[0]?.band.text).toBe('16:00–17:00 · 일정과 겹쳐요');
  });
});

describe('What was dropped', () => {
  it('names the event and why, at its place', () => {
    const { dropped } = answerOf(myDay(), [event('짧은 행사', '13:00', '14:20'), event('공연', '13:52', null)]);

    expect(dropped).toEqual([
      { place: point('문화관'), reason: '짧은 행사 · 26분밖에 못 있어요' },
      { place: point('문화관'), reason: '공연 · 13:54에야 도착해요' },
    ]);
  });
});

describe('A day with no event to attend', () => {
  it('answers no plan and says so', () => {
    const { plans, noPlan } = answerOf(myDay(), []);

    expect(plans).toEqual([]);
    expect(noPlan).toEqual({ reason: 'no-fit', lines: [plain('오늘은 다녀올 만한 행사가 없어요')] });
  });

  it('says 그날 for another day', () => {
    const { noPlan } = answerOf(myDay(), [], '2026-11-21');

    expect(noPlan?.lines).toEqual([plain('그날은 다녀올 만한 행사가 없어요')]);
  });

  it('is not one whose only event clashes: that event is still a plan', () => {
    const { plans, noPlan } = answerOf(myDay(), [event('설명회', '16:00', '17:00')]);

    expect(plans.map(({ id: planId }) => planId)).toEqual(['설명회']);
    expect(noPlan).toBeNull();
  });
});
