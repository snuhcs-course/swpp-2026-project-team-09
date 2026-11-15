/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { dayAnswer, type DayAnswer } from '../src/assistant/lookup/day-lookup.js';
import { classAt, id, ME, placeOf, point, position, readCampus, seedTravel, time, TUESDAY } from './way-example.js';

// A day's Classes drawn on the map (board q14): "오늘 수업 뭐 있어?" on Tuesday at 10:30, with Classes in 301동, 24동,
// and 58동, on the seed's Places and walking table.

beforeAll(() => readCampus());

const COURSE = '비밀스러운 알고리즘 특강';

const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

// Board q14's Classes, each with a course name that is never shown.
const boardQ14 = (): DayItem[] => [
  { ...classAt(TUESDAY, '11:00', '11:50', '제1공학관'), name: COURSE },
  { ...classAt(TUESDAY, '13:00', '13:50', '자연과학관6'), name: COURSE },
  { ...classAt(TUESDAY, '17:00', '18:15', 'SK경영관'), name: COURSE },
];

const badminton: DayItem = {
  id: 'badminton',
  name: '배드민턴',
  start: onDay(TUESDAY, '15:00'),
  end: onDay(TUESDAY, '16:00'),
  placeId: null,
  isClass: false,
};

function dayAt(clock: string, items: DayItem[] = boardQ14()): DayAnswer {
  return dayAnswer({
    date: TUESDAY,
    now: onDay(TUESDAY, clock),
    me: { userId: ME, items },
    travel: seedTravel(),
    placeOf,
  });
}

function lookupAt(clock: string, items?: DayItem[]): Lookup {
  const answer = dayAt(clock, items);
  if (answer.result !== 'found') {
    throw new Error('No Classes');
  }
  return answer.lookup;
}

describe("Tuesday's Classes at 10:30 (board q14)", () => {
  it('are a day, with the count in the title line, the Free Time, and the walks between the Classes', () => {
    const lookup = lookupAt('10:30');

    expect(lookup).toMatchObject({ kind: 'day', chips: [], band: null });
    expect(lookup.lines).toEqual([
      [plain('11월 17일 화요일 '), strong('수업 3개')],
      [plain('빈 시간 70분, 3시간 10분')],
      [plain('수업 사이 걸어서 15분, 12분')],
    ]);
  });

  it('are listed as steps, each its time and building', () => {
    expect(lookupAt('10:30').steps).toEqual([
      { at: '11:00–11:50', text: '301동' },
      { at: '13:00–13:50', text: '24동' },
      { at: '17:00–18:15', text: '58동' },
    ]);
  });

  it('are numbered in order at their buildings, with the walks between them drawn as the next items', () => {
    expect(lookupAt('10:30').scene).toEqual({
      people: [],
      places: [
        { place: point('제1공학관', '301동'), role: 'next', tag: '11:00–11:50 · 301동', order: 1 },
        { place: point('자연과학관6', '24동'), role: 'next', tag: '13:00–13:50 · 24동', order: 2 },
        { place: point('SK경영관', '58동'), role: 'next', tag: '17:00–18:15 · 58동', order: 3 },
      ],
      routes: [
        { userId: ME, role: 'next', from: position('제1공학관'), to: position('자연과학관6'), minutes: 15 },
        { userId: ME, role: 'next', from: position('자연과학관6'), to: position('SK경영관'), minutes: 12 },
      ],
      flags: [],
    });
  });

  it('rest on the walking table', () => {
    expect(lookupAt('10:30').basis).toEqual(['301동 → 24동 걸어서 15분', '24동 → 58동 걸어서 12분']);
  });

  it('offer a leave-by notification for the first walk still ahead', () => {
    expect(lookupAt('10:30').actions).toEqual([
      { kind: 'remind', at: time(TUESDAY, '12:45'), text: '지금 나서면 13:00 수업에 맞아요 · 24동까지 걸어서 15분' },
    ]);
  });
});

describe('The leave-by notification later in the day', () => {
  it('is for the walk to 58동 once the time to set out for 24동 has passed', () => {
    expect(lookupAt('13:10').actions).toEqual([
      { kind: 'remind', at: time(TUESDAY, '16:48'), text: '지금 나서면 17:00 수업에 맞아요 · 58동까지 걸어서 12분' },
    ]);
  });

  it('is none at the last time to set out, which is no longer ahead', () => {
    expect(lookupAt('16:48').actions).toEqual([]);
  });
});

describe('What the model is given of a day', () => {
  it('holds clock times, buildings, and minutes, and no course name', () => {
    const answer = dayAt('10:30');

    expect(answer).toMatchObject({
      result: 'found',
      words: {
        date: TUESDAY,
        classes: [
          { start: '11:00', end: '11:50', place: '301동' },
          { start: '13:00', end: '13:50', place: '24동' },
          { start: '17:00', end: '18:15', place: '58동' },
        ],
        freeMinutes: [70, 190],
        walkMinutes: [15, 12],
      },
    });
    expect(JSON.stringify(answer)).not.toContain(COURSE);
  });
});

describe('A day without Classes', () => {
  it('answers none, a Sub Quest of the day being no Class', () => {
    expect(dayAt('10:30', [badminton])).toEqual({ result: 'none', reason: 'no-classes' });
  });
});

describe("The User's Sub Quests", () => {
  it('are not part of the day: only the Classes are listed', () => {
    expect(lookupAt('10:30', [...boardQ14(), badminton]).steps).toHaveLength(3);
  });
});

describe('A Class without a Place', () => {
  it('is listed without a building and drawn nowhere, the others keeping their numbers', () => {
    const lookup = lookupAt('10:30', [
      classAt(TUESDAY, '11:00', '11:50', '제1공학관'),
      { ...classAt(TUESDAY, '13:00', '13:50', '자연과학관6'), placeId: null },
      classAt(TUESDAY, '17:00', '18:15', 'SK경영관'),
    ]);

    expect(lookup.steps?.[1]).toEqual({ at: '13:00–13:50', text: '장소 없음' });
    expect(lookup.scene.places.map(({ place, order }) => [place.placeId, order])).toEqual([
      [id('제1공학관'), 1],
      [id('SK경영관'), 3],
    ]);
    expect(lookup.scene.routes).toEqual([]);
  });
});
