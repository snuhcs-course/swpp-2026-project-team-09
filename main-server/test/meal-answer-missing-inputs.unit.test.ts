/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type LocationMissing, type MealInput } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { gather, type GatheringPerson } from '../src/assistant/gathering/gathering.js';
import { mealAnswer } from '../src/assistant/gathering/meal-answer.js';
import { windowOf } from '../src/assistant/gathering/plan-conditions.js';
import { at as atClock, free, item, person as gatheringOf, place, walks, window } from './gathering-fixtures.js';
import { ME, person, plain, strong } from './meal-answers.js';
import { at, DATE, gatheringPerson, id, myDay, placeOf, plan, readWorld, restaurants } from './worked-example.js';

// Without a location or a Timetable (P02-13, boards n13 and n15): where the asker sets out from without a location,
// and what the answer says it assumed instead.

beforeAll(() => readWorld());

const missing = (intervals: Parameters<typeof gatheringOf>[1]): GatheringPerson => ({
  ...gatheringOf('me', intervals),
  locationMissing: true,
});

describe('Where the asker sets out from without a location', () => {
  const travel = walks(['A', 'P', 60]);
  const originAt = (asker: GatheringPerson, now: string): object | null =>
    gather([asker], [place('cafe', 'P')], { window, now: atClock(now) }, travel).fits[0]?.parts[0]?.origin ?? null;

  // Partitions: the previous item ended within 15 minutes, long before, or there is none; the mark or none.
  it('is the Place of the previous Class however long ago it ended, marked assumed', () => {
    const asker = missing([free('12:00', '14:30', item('09:00', '09:50', 'A'), null)]);

    expect(originAt(asker, '12:40')).toEqual({ placeId: 'A', basis: 'timetable', assumed: true });
  });

  it('is marked assumed when the Class ended within 15 minutes too', () => {
    const asker = missing([free('12:00', '14:30', item('11:00', '11:59', 'A'), null)]);

    expect(originAt(asker, '12:00')).toEqual({ placeId: 'A', basis: 'timetable', assumed: true });
  });

  it('is unknown with no previous item', () => {
    expect(originAt(missing([free('12:00', '14:30', null, null)]), '12:00')).toBeNull();
  });

  it('is unknown after 15 minutes for a person whose location is not said to be missing', () => {
    const asker = gatheringOf('me', [free('12:00', '14:30', item('11:00', '11:44', 'A'), null)]);

    expect(originAt(asker, '12:00')).toBeNull();
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
  const asker: GatheringPerson = {
    ...gatheringPerson(ME, items, located, now),
    locationMissing: located === null && locationMissing !== null,
  };
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

describe('Board n13: no location permission, at 12:30, the Class in 301동 over at 11:50', () => {
  it('sets out from 301동, its chip marked assumed', () => {
    expect(n13().chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null, mark: 'assumed' },
      { kind: 'until', text: '13:00 수업까지', userId: null },
    ]);
  });

  it("says so in place of the first Plan's lines", () => {
    expect(n13().plans[0]?.lines).toEqual([
      [plain('위치를 몰라 직전 수업의')],
      [strong('301동'), plain('에서 출발로 잡았어요')],
    ]);
  });

  it("keeps the candidates, their order, and the other Plans' lines", () => {
    const [assumed, located] = [n13(), at301()];

    expect(assumed.plans.map(({ id: key }) => key)).toEqual(located.plans.map(({ id: key }) => key));
    expect(assumed.plans.slice(1).map(({ lines }) => lines)).toEqual(located.plans.slice(1).map(({ lines }) => lines));
  });

  it('offers 위치 켜기, which opens the explanation of the location, and no note', () => {
    const answer = n13();

    expect(answer.offers).toEqual([{ kind: 'open', label: '위치 켜기', screen: 'location' }]);
    expect(answer.note).toBeUndefined();
  });

  it('offers nothing off campus, where the location is on', () => {
    const answer = answerFor({ clock: '12:30', items: myDay(), located: null, locationMissing: 'off-campus' });

    expect(answer.chips[0]).toEqual({ kind: 'origin', text: '301동에서', userId: null, mark: 'assumed' });
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

  it('says the first is the nearest, in one line', () => {
    expect(n15().plans[0]?.lines).toEqual([[strong('301동식당'), plain('이 가장 가까워요')]]);
  });

  it('says in every basis why they come nearest first', () => {
    for (const { basis } of n15().plans) {
      expect(basis[0]).toBe('시간표가 없어 가까운 순서로 넘겨 봐요');
    }
  });

  it('notes what a Timetable would add, and offers 시간표 넣기', () => {
    const answer = n15();

    expect(answer.note).toBe('시간표를 넣으면 나설 시각까지 알려 드려요');
    expect(answer.offers).toEqual([{ kind: 'open', label: '시간표 넣기', screen: 'timetable' }]);
  });

  it('claims no order without a location either, and offers both', () => {
    const answer = answerFor({ clock: '11:50', items: [], located: null, locationMissing: 'permission' });

    expect(answer.plans[0]?.lines[0]).not.toEqual([strong('301동식당'), plain('이 가장 가까워요')]);
    expect(answer.plans[0]?.basis).not.toContain('시간표가 없어 가까운 순서로 넘겨 봐요');
    expect(answer.offers?.map(({ label }) => label)).toEqual(['위치 켜기', '시간표 넣기']);
  });
});
