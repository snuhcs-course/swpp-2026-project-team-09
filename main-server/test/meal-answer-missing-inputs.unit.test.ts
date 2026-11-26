/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type LocationMissing, type MealInput } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { gather, type GatheringPerson } from '../src/assistant/gathering/gathering.js';
import { mealAnswer } from '../src/assistant/gathering/meal-answer.js';
import { windowOf } from '../src/assistant/gathering/plan-conditions.js';
import { at as atClock, free, item, person as gatheringOf, place, walks, window } from './gathering-fixtures.js';
import { ME, person, plain, strong } from './meal-answers.js';
import { at, DATE, gatheringPerson, id, myDay, placeOf, plan, readWorld, restaurants } from './worked-example.js';

// Without a location or a Timetable (P02-13, boards n13 and n15). Since P05 ticket 42 the asker of a meal without a
// position sets out from where nobody knows: an item that has ended is never taken as where they are.

beforeAll(() => readWorld());

const mealAsker = (intervals: Parameters<typeof gatheringOf>[1]): GatheringPerson => ({
  ...gatheringOf('me', intervals),
  positionOnly: true,
});

describe('Where the asker of a meal sets out from without a position', () => {
  const travel = walks(['A', 'P', 60]);
  const originAt = (who: GatheringPerson, now: string): object | null =>
    gather([who], [place('cafe', 'P')], { window, now: atClock(now) }, travel).fits[0]?.parts[0]?.origin ?? null;

  // Partitions: the previous item ended within 15 minutes, long before, or there is none; the asker or not.
  it('is unknown however long ago the previous Class ended', () => {
    expect(originAt(mealAsker([free('12:00', '14:30', item('09:00', '09:50', 'A'), null)]), '12:40')).toBeNull();
  });

  it('is unknown when the Class ended within 15 minutes too', () => {
    expect(originAt(mealAsker([free('12:00', '14:30', item('11:00', '11:59', 'A'), null)]), '12:00')).toBeNull();
  });

  it('is unknown with no previous item', () => {
    expect(originAt(mealAsker([free('12:00', '14:30', null, null)]), '12:00')).toBeNull();
  });

  it('is unknown after 15 minutes for a person who is not the asker of a meal, as before', () => {
    const someone = gatheringOf('me', [free('12:00', '14:30', item('11:00', '11:44', 'A'), null)]);

    expect(originAt(someone, '12:00')).toBeNull();
  });
});

const NO_BOUNDS: MealInput['window'] = { from: null, until: null };

const lunch = (bounds: MealInput['window']): MealInput => ({
  kind: 'meal',
  date: DATE,
  meal: 'lunch',
  people: [{ userId: ME, constraints: [] }],
  window: bounds,
  placeId: null,
});

interface Asking {
  clock: string;
  items: DayItem[];
  // The Place of the asker's location, null without one.
  located: string | null;
  locationMissing: LocationMissing;
  input?: MealInput;
}

// The asker alone, asking at that time of the worked example's Tuesday.
function answerFor({ clock, items, located, locationMissing, input = lunch(NO_BOUNDS) }: Asking): AnswerReply {
  const now = at(clock);
  const asker: GatheringPerson = { ...gatheringPerson(ME, items, located, now), positionOnly: true };
  return mealAnswer({
    input,
    now,
    people: [person(ME, '유상', items)],
    gathering: plan([asker], restaurants(), now, windowOf(input)),
    aloneMinutes: null,
    menus: 'open',
    placeOf,
    missing: { locationMissing, noClasses: !items.some(({ isClass }) => isClass) },
  });
}

const n13 = (): AnswerReply =>
  answerFor({ clock: '12:30', items: myDay(), located: null, locationMissing: 'permission' });
// The same asker at 301동.
const at301 = (): AnswerReply =>
  answerFor({ clock: '12:30', items: myDay(), located: id('제1공학관'), locationMissing: null });

// The offers with their hint lines (P04 ticket 86).
const TURN_LOCATION_ON = {
  kind: 'open',
  label: '위치 켜기',
  screen: 'location',
  hint: '위치를 켜면 지금 있는 곳에서 가까운 순으로 봐요',
};
const ADD_TIMETABLE = {
  kind: 'open',
  label: '시간표 넣기',
  screen: 'timetable',
  hint: '시간표를 넣으면 나설 시각까지 알려 드려요',
};

// Board n13 assumed the Class's 301동; since P05 ticket 42 the asker without a position sets out from where nobody knows.
describe('Board n13: no location permission, at 12:30, the Class in 301동 over at 11:50', () => {
  it('has no origin chip', () => {
    expect(n13().chips).toEqual([{ kind: 'until', text: '13:00 수업까지', userId: null }]);
  });

  it('plans no way for the asker and says nothing of 301동 as where they set out from', () => {
    const [first] = n13().plans;

    expect(first?.parts[0]).toMatchObject({ origin: null, walkMinutes: null });
    expect(first?.lines.flat().map(({ text }) => text)).not.toContain('에서 출발로 잡았어요');
  });

  it('offers 위치 켜기 with its hint, which opens the explanation of the location, and no note', () => {
    const answer = n13();

    expect(answer.offers).toEqual([TURN_LOCATION_ON]);
    expect(answer.note).toBeUndefined();
  });

  it('offers nothing off campus, where the location is on', () => {
    const answer = answerFor({ clock: '12:30', items: myDay(), located: null, locationMissing: 'off-campus' });

    expect(answer.chips.map(({ kind }) => kind)).not.toContain('origin');
    expect(answer).not.toHaveProperty('offers');
  });

  it('marks nothing, says nothing more, and offers nothing with the location', () => {
    const answer = at301();

    expect(answer.chips[0]).toEqual({ kind: 'origin', text: '301동에서', userId: null });
    expect(answer).not.toHaveProperty('offers');
    expect(answer).not.toHaveProperty('note');
  });
});

const n15 = (input?: MealInput): AnswerReply =>
  answerFor({ clock: '11:50', items: [], located: id('제1공학관'), locationMissing: null, input });
const walksOf = ({ plans }: AnswerReply): (number | null)[] => plans.map(({ parts }) => parts[0]?.walkMinutes ?? null);
const ascending = (minutes: (number | null)[]): (number | null)[] => minutes.toSorted((a, b) => (a ?? 0) - (b ?? 0));

describe('Board n15: no Timetable, at 11:50 at 301동', () => {
  it('puts the nearest Restaurant first, and the rest nearest first', () => {
    const answer = n15();

    expect(answer.plans[0]?.id).toBe('301동식당');
    expect(walksOf(answer)).toEqual(ascending(walksOf(answer)));
  });

  it('keeps them nearest first when the start is fixed later, where every Plan has the same time', () => {
    const answer = n15(lunch({ from: '13:00', until: null }));

    expect(walksOf(answer)).toEqual(ascending(walksOf(answer)));
  });

  it('claims no order with a Place fixed, where nearest is not what was asked (review 2026-11-16)', () => {
    const answer = n15({ ...lunch(NO_BOUNDS), placeId: id('학생회관') });

    expect(answer.plans[0]?.lines[0]).not.toEqual([strong('301동식당'), plain('이 가장 가까워요')]);
    expect(answer.plans.flatMap(({ lines }) => lines.flat().map(({ text }) => text))).not.toContain('이 가장 가까워요');
    for (const { basis } of answer.plans) {
      expect(basis).not.toContain('시간표가 없어 가까운 순서로 넘겨 봐요');
    }
    expect(answer.offers?.map(({ label }) => label)).toEqual(['시간표 넣기']);
  });

  it('says the first is the nearest, in one line', () => {
    expect(n15().plans[0]?.lines).toEqual([[strong('301동식당'), plain('이 가장 가까워요')]]);
  });

  it('says in every basis why they come nearest first', () => {
    for (const { basis } of n15().plans) {
      expect(basis[0]).toBe('시간표가 없어 가까운 순서로 넘겨 봐요');
    }
  });

  it('notes what a Timetable would add, for the apps before P04 ticket 86, and offers 시간표 넣기 with it as the hint', () => {
    const answer = n15();

    expect(answer.note).toBe('시간표를 넣으면 나설 시각까지 알려 드려요');
    expect(answer.offers).toEqual([ADD_TIMETABLE]);
  });

  it('claims no order without a location either, and offers both', () => {
    const answer = answerFor({ clock: '11:50', items: [], located: null, locationMissing: 'permission' });

    expect(answer.plans[0]?.lines[0]).not.toEqual([strong('301동식당'), plain('이 가장 가까워요')]);
    expect(answer.plans[0]?.basis).not.toContain('시간표가 없어 가까운 순서로 넘겨 봐요');
    expect(answer.offers?.map(({ label }) => label)).toEqual(['위치 켜기', '시간표 넣기']);
  });
});
