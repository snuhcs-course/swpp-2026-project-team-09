/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf, type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type DayQuest, fitQuests, type QuestPlan, type QuestStep } from '../src/assistant/recruiting/quest-fit.js';
import { type TravelProvider } from '../src/travel/travel.js';
import { DATE, id, myDay, NOW, readExample, travel } from './events-example.js';

// The recruiting Quests the asker could join: the design's examples (section 6.3 Together 5, section 6.4 Join 1 and
// 2) on the seed's walking table with the design's shuttle, and the boundaries on a small table of three Places.

beforeAll(() => readExample());

// A plan as "id start–end (stay)", in clock times in Korea.
const summary = ({ quest, start, end, stayMinutes }: QuestPlan): string =>
  `${quest.id} ${clockOf(start)}–${clockOf(end)} (${stayMinutes})`;

const step = (date: string, start: string, placeId: string | null, end: string | null = null): QuestStep => ({
  start: onDay(date, start),
  end: end === null ? null : onDay(date, end),
  placeId,
  place: placeId,
  cancelled: false,
});

const quest = (questId: string, steps: QuestStep[], more: Partial<DayQuest> = {}): DayQuest => ({
  id: questId,
  title: questId,
  steps,
  eventEnd: null,
  friendNames: [],
  ...more,
});

describe('Row 4: Friday 13:50, the job fair’s parties, Classes in 24동 until 13:50 and in 301동 from 15:30', () => {
  const jobFairEnd = onDay(DATE, '17:00');
  const rowFour = (): ReturnType<typeof fitQuests> =>
    fitQuests(
      {
        quests: [
          quest('early', [step(DATE, '13:30', id('문화관'))], { eventEnd: jobFairEnd }),
          quest('with-minsu', [step(DATE, '14:20', id('문화관'))], { eventEnd: jobFairEnd, friendNames: ['민수'] }),
        ],
        itemsOn: () => myDay(),
        now: NOW,
        locationPlaceId: null,
      },
      travel,
    );

  it('plans the 14:20 party with 민수 from 14:20 to 15:12, 52 minutes, and drops the 13:30 party as started', () => {
    const { plans, dropped } = rowFour();

    expect(plans.map((plan) => summary(plan))).toEqual(['with-minsu 14:20–15:12 (52)']);
    expect(dropped).toMatchObject([{ quest: { id: 'early' }, reason: { kind: 'started' } }]);
  });

  it('walks from 24동 in 4 minutes, setting out at 14:16, and leaves at 15:12 for the 15:30 Class', () => {
    expect(rowFour().plans[0]).toMatchObject({
      origin: { placeId: id('24동'), basis: 'timetable' },
      there: { minutes: 4, mode: 'walk' },
      leaveAt: onDay(DATE, '14:16'),
      leaveBy: onDay(DATE, '15:12'),
      next: { item: { start: onDay(DATE, '15:30') }, way: { minutes: 18 } },
    });
  });
});

describe('Row 5: Thursday 16:45, two badminton parties at the gymnasium, a Class in 301동 until 16:45', () => {
  const thursday = '2026-11-19';
  const rowFive = (): ReturnType<typeof fitQuests> =>
    fitQuests(
      {
        quests: [
          quest('at-17', [step(thursday, '17:00', id('체육관'))]),
          quest('at-18', [step(thursday, '18:00', id('체육관'))]),
        ],
        itemsOn: () => [
          {
            id: '301동',
            name: 'Class',
            start: onDay(thursday, '15:30'),
            end: onDay(thursday, '16:45'),
            placeId: id('301동'),
            isClass: true,
          },
        ],
        now: onDay(thursday, '16:45'),
        locationPlaceId: null,
      },
      travel,
    );

  it('plans the 18:00 party by shuttle, setting out at 17:43, and drops the 17:00 party, reached only at 17:02', () => {
    const { plans, dropped } = rowFive();

    expect(plans.map((plan) => summary(plan))).toEqual(['at-18 18:00–18:30 (30)']);
    expect(plans[0]).toMatchObject({ there: { minutes: 17, mode: 'shuttle' }, leaveAt: onDay(thursday, '17:43') });
    expect(dropped).toMatchObject([
      { quest: { id: 'at-17' }, reason: { kind: 'late', arriveAt: onDay(thursday, '17:02') } },
    ]);
  });
});

// Three Places: A to B is 10 minutes on foot, B to C 20, A to C 15; the shuttle takes 5 from A to C when asked.
function smallTravel(shuttle = false): TravelProvider {
  const walks: Record<string, number> = { 'A B': 10, 'B C': 20, 'A C': 15 };
  const walk = (from: string, to: string): number =>
    from === to ? 0 : 60 * (walks[`${from} ${to}`] ?? walks[`${to} ${from}`] ?? Number.NaN);
  return {
    travel: (from, to) =>
      shuttle && from === 'A' && to === 'C'
        ? { seconds: 5 * 60, mode: 'shuttle' }
        : { seconds: walk(from, to), mode: 'walk' },
    walkingSeconds: walk,
  };
}

const time = (clock: string): Date => onDay(DATE, clock);

const item = (start: string, end: string, placeId: string | null): DayItem => ({
  id: `${placeId} ${start}`,
  name: 'Class',
  start: time(start),
  end: time(end),
  placeId,
  isClass: true,
});

// Free from 13:50 in A, with nothing after unless given.
function fit(
  quests: DayQuest[],
  { after = [], travelBy = smallTravel() }: { after?: DayItem[]; travelBy?: TravelProvider } = {},
): ReturnType<typeof fitQuests> {
  return fitQuests(
    { quests, itemsOn: () => [item('13:00', '13:50', 'A'), ...after], now: time('13:50'), locationPlaceId: null },
    travelBy,
  );
}

describe('Reaching a step', () => {
  it('exactly at its start fits, setting out at once', () => {
    const { plans } = fit([quest('q', [step(DATE, '14:00', 'B')])]);

    expect(plans.map((plan) => summary(plan))).toEqual(['q 14:00–14:30 (30)']);
    expect(plans[0]?.leaveAt).toEqual(time('13:50'));
  });

  it('a minute after its start drops the Quest with the arrival', () => {
    const { plans, dropped } = fit([quest('q', [step(DATE, '13:59', 'B')])]);

    expect(plans).toEqual([]);
    expect(dropped).toMatchObject([{ quest: { id: 'q' }, reason: { kind: 'late', arriveAt: time('14:00') } }]);
  });

  it('that has started drops the Quest, however near', () => {
    const { dropped } = fit([quest('q', [step(DATE, '13:49', 'A', '15:00')])]);

    expect(dropped).toMatchObject([{ reason: { kind: 'started' } }]);
  });

  it('while the asker is in a Class counts the way from the end of that Class', () => {
    const { dropped } = fit([quest('q', [step(DATE, '14:30', 'B')])], { after: [item('14:00', '15:00', 'A')] });

    expect(dropped).toMatchObject([{ reason: { kind: 'late', arriveAt: time('15:10') } }]);
  });

  it('by the shuttle when the travel provider finds it faster', () => {
    const { plans } = fit([quest('q', [step(DATE, '15:00', 'C')])], { travelBy: smallTravel(true) });

    expect(plans[0]).toMatchObject({ there: { minutes: 5, mode: 'shuttle' }, leaveAt: time('14:55') });
  });
});

describe('The step judged', () => {
  it('is the first ahead with a start and a Place of the list, by start', () => {
    const { plans } = fit([
      quest('q', [
        step(DATE, '15:00', 'C'),
        { ...step(DATE, '14:00', 'B'), cancelled: true },
        step(DATE, '14:30', null),
        step(DATE, '14:40', 'B'),
      ]),
    ]);

    expect(plans.map((plan) => summary(plan))).toEqual(['q 14:40–15:10 (30)']);
  });

  it('leaves a Quest out, neither planned nor dropped, when it has no such step', () => {
    const { plans, dropped } = fit([
      quest('q', [step(DATE, '14:30', null), { ...step(DATE, '14:00', 'B'), start: null }]),
    ]);

    expect(plans).toEqual([]);
    expect(dropped).toEqual([]);
  });
});

describe('The stay', () => {
  it('runs to the step’s end, or to when the asker must leave for the next item, whichever is first', () => {
    const { plans } = fit([quest('q', [step(DATE, '14:00', 'B', '18:00')])], { after: [item('16:00', '17:00', 'C')] });

    expect(plans.map((plan) => summary(plan))).toEqual(['q 14:00–15:40 (100)']);
    expect(plans[0]?.leaveBy).toEqual(time('15:40'));
  });

  it('of a step with no end runs to its Global Event’s end, and otherwise 30 minutes', () => {
    const { plans } = fit([
      quest('event', [step(DATE, '14:00', 'B')], { eventEnd: time('16:00') }),
      quest('plain', [step(DATE, '14:10', 'B')]),
    ]);

    expect(plans.map((plan) => summary(plan))).toEqual(['event 14:00–16:00 (120)', 'plain 14:10–14:40 (30)']);
  });
});

describe('The order', () => {
  it('is a Quest a Friend holds first, then the earlier start, then the title', () => {
    const { plans } = fit([
      quest('b', [step(DATE, '14:30', 'B')]),
      quest('a', [step(DATE, '14:30', 'B')]),
      quest('early', [step(DATE, '14:10', 'B')]),
      quest('friend', [step(DATE, '15:00', 'B')], { friendNames: ['민수'] }),
    ]);

    expect(plans.map(({ quest: { id: questId } }) => questId)).toEqual(['friend', 'early', 'a', 'b']);
  });
});
