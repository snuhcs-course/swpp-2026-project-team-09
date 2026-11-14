/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayEvent, type EventPlan, fitEvents } from '../src/assistant/events/event-fit.js';
import { clockOf, type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type TravelProvider } from '../src/travel/travel.js';
import { at, DATE, events, id, myDay, NOW, readExample, travel } from './events-example.js';

// The Global Events of a day the asker can attend: the design's worked example (section 6.3) on the seed's walking
// table, and the boundaries on a small table of three Places.

beforeAll(() => readExample());

// A plan as "id state start–end (stay)", in clock times in Korea.
const summary = ({ event, state, start, end, stayMinutes }: EventPlan): string =>
  `${event.id} ${state} ${clockOf(start)}–${clockOf(end)} (${stayMinutes})`;

const workedExample = (): ReturnType<typeof fitEvents> =>
  fitEvents({ items: myDay(), date: DATE, now: NOW, locationPlaceId: null, events: events() }, travel);

describe('The worked example: Friday 13:50, Classes in 24동 until 13:50 and in 301동 from 15:30', () => {
  it('plans the job fair first, the concert next, and the company session last as a clash, dropping none', () => {
    const { plans, dropped } = workedExample();

    expect(plans.map((plan) => summary(plan))).toEqual([
      'job-fair under-way 13:54–15:12 (78)',
      'concert not-started 18:00–18:30 (30)',
      'company-session clash 16:00–17:00 (60)',
    ]);
    expect(dropped).toEqual([]);
  });

  it('walks the job fair from 24동 in 4 minutes and leaves at 15:12 for 301동, 18 minutes on foot', () => {
    const [jobFair] = workedExample().plans;

    expect(jobFair).toMatchObject({
      origin: { placeId: id('24동'), basis: 'timetable' },
      there: { minutes: 4, mode: 'walk' },
      leaveAt: at('13:50'),
      leaveBy: at('15:12'),
      next: { item: { start: at('15:30'), placeId: id('301동') }, way: { minutes: 18, mode: 'walk' } },
      clash: null,
    });
  });

  it('takes the shuttle to the concert from 301동, 18 minutes, setting out at 17:42', () => {
    const concert = workedExample().plans[1];

    expect(concert).toMatchObject({
      origin: { placeId: id('301동'), basis: 'timetable' },
      there: { minutes: 18, mode: 'shuttle' },
      leaveAt: at('17:42'),
      leaveBy: null,
      next: null,
    });
  });

  it('counts the way to the company session as if the asker went: 4 minutes from 24동, setting out at 15:56', () => {
    const session = workedExample().plans[2];

    expect(session).toMatchObject({
      there: { minutes: 4, mode: 'walk' },
      leaveAt: at('15:56'),
      clash: { start: at('15:30'), isClass: true },
    });
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

const time = (clockTime: string): Date => onDay(DATE, clockTime);

const item = (start: string, end: string, placeId: string | null, isClass = true): DayItem => ({
  id: `${placeId} ${start}`,
  name: 'Class',
  start: time(start),
  end: time(end),
  placeId,
  isClass,
});

const event = (eventId: string, start: string, end: string | null, placeId: string | null = 'B'): DayEvent => ({
  id: eventId,
  title: eventId,
  start: time(start),
  end: end === null ? null : time(end),
  placeId,
  place: placeId,
});

// Free from 13:50 in A, with nothing after unless given.
function fit(
  dayEvents: DayEvent[],
  {
    after = [],
    location = null,
    travelBy = smallTravel(),
  }: { after?: DayItem[]; location?: string | null; travelBy?: TravelProvider } = {},
): ReturnType<typeof fitEvents> {
  return fitEvents(
    {
      items: [item('13:00', '13:50', 'A'), ...after],
      date: DATE,
      now: time('13:50'),
      locationPlaceId: location,
      events: dayEvents,
    },
    travelBy,
  );
}

describe('An event that has not started', () => {
  it('fits when the asker arrives exactly at its start, attended from the start', () => {
    const { plans } = fit([event('talk', '14:00', '15:00')]);

    expect(plans.map((plan) => summary(plan))).toEqual(['talk not-started 14:00–15:00 (60)']);
    expect(plans[0]?.leaveAt).toEqual(time('13:50'));
  });

  it('a minute before the asker can arrive is under way, and is dropped when they could stay less than 30 minutes', () => {
    const { plans, dropped } = fit([event('talk', '13:59', '14:29')]);

    expect(plans).toEqual([]);
    expect(dropped).toEqual([
      { event: expect.objectContaining({ id: 'talk' }) as unknown, reason: { kind: 'short', minutes: 29 } },
    ]);
  });

  it('with no end is dropped when the asker arrives after its start, since they cannot be there for it', () => {
    const { dropped } = fit([event('concert', '13:59', null)]);

    expect(dropped).toMatchObject([{ reason: { kind: 'late', arriveAt: time('14:00') } }]);
  });

  it('with no end is attended for 30 minutes from its start', () => {
    const { plans } = fit([event('concert', '14:30', null)]);

    expect(plans.map((plan) => summary(plan))).toEqual(['concert not-started 14:30–15:00 (30)']);
  });

  it('sets out as late as still has the asker there at the start', () => {
    const { plans } = fit([event('talk', '16:00', '17:00')]);

    expect(plans[0]?.leaveAt).toEqual(time('15:50'));
  });
});

describe('An event under way', () => {
  it('fits when the asker can stay 30 minutes, and is dropped at 29', () => {
    const { plans, dropped } = fit([event('fair', '13:00', '14:30'), event('fair2', '13:00', '14:29')]);

    expect(plans.map((plan) => summary(plan))).toEqual(['fair under-way 14:00–14:30 (30)']);
    expect(dropped).toMatchObject([{ event: { id: 'fair2' }, reason: { kind: 'short', minutes: 29 } }]);
  });

  it('ends the stay when the asker must leave for the next item, by the way on to its Place', () => {
    const { plans } = fit([event('fair', '13:00', '18:00')], { after: [item('16:00', '17:00', 'C')] });

    expect(plans.map((plan) => summary(plan))).toEqual(['fair under-way 14:00–15:40 (100)']);
    expect(plans[0]).toMatchObject({ leaveBy: time('15:40'), next: { way: { minutes: 20, mode: 'walk' } } });
  });

  it('ends the stay at the start of a next item without a Place', () => {
    const { plans } = fit([event('fair', '13:00', '18:00')], { after: [item('16:00', '17:00', null)] });

    expect(plans[0]).toMatchObject({ leaveBy: time('16:00'), next: { way: null } });
  });
});

describe('What is left out', () => {
  it('is an event that is over and one without a Place, neither planned nor dropped', () => {
    const { plans, dropped } = fit([event('over', '12:00', '13:50'), event('nowhere', '14:00', '15:00', null)]);

    expect(plans).toEqual([]);
    expect(dropped).toEqual([]);
  });
});

describe('An event a Class lies over', () => {
  it('is kept after those that fit, by start, and names the Class', () => {
    const { plans } = fit(
      [event('late', '16:30', '17:00'), event('early', '16:00', '16:20'), event('talk', '14:00', '14:45')],
      {
        after: [item('16:00', '17:30', 'C')],
      },
    );

    expect(plans.map((plan) => summary(plan))).toEqual([
      'talk not-started 14:00–14:45 (45)',
      'early clash 16:00–16:20 (20)',
      'late clash 16:30–17:00 (30)',
    ]);
    expect(plans[1]?.clash).toMatchObject({ start: time('16:00'), placeId: 'C' });
  });
});

describe('The order of the events that fit', () => {
  it('is the longer stay first, then the earlier start, then the title', () => {
    const { plans } = fit([
      event('b', '15:00', '16:00'),
      event('a', '15:00', '16:00'),
      event('early', '14:00', '15:00'),
      event('long', '16:00', '18:00'),
    ]);

    expect(plans.map(({ event: { id: eventId } }) => eventId)).toEqual(['long', 'early', 'a', 'b']);
  });
});

describe("The asker's origin", () => {
  it('is unknown with no item before, no location, and no recent item: no way is counted, only the times', () => {
    const { plans } = fitEvents(
      { items: [], date: DATE, now: time('13:50'), locationPlaceId: null, events: [event('talk', '13:50', '15:00')] },
      smallTravel(),
    );

    expect(plans.map((plan) => summary(plan))).toEqual(['talk not-started 13:50–15:00 (70)']);
    expect(plans[0]).toMatchObject({ origin: null, there: null, leaveAt: null });
  });

  it("is the location's Place when the asker is free now", () => {
    const { plans } = fitEvents(
      { items: [], date: DATE, now: time('13:50'), locationPlaceId: 'A', events: [event('talk', '14:00', '15:00')] },
      smallTravel(),
    );

    expect(plans[0]).toMatchObject({ origin: { placeId: 'A', basis: 'location' }, there: { minutes: 10 } });
  });
});

describe('The shuttle', () => {
  it('is the way when the travel provider finds it faster, and the walk otherwise', () => {
    const talk = event('talk', '15:00', '16:00', 'C');

    expect(fit([talk], { travelBy: smallTravel(true) }).plans[0]).toMatchObject({
      there: { minutes: 5, mode: 'shuttle' },
      leaveAt: time('14:55'),
    });
    expect(fit([talk]).plans[0]).toMatchObject({ there: { minutes: 15, mode: 'walk' }, leaveAt: time('14:45') });
  });
});
