/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf, onDay } from '../src/assistant/free-time/free-time.js';
import { type Order, orderOf, type Stop } from '../src/assistant/lookup/tutorial-order.js';

// The order of the Tutorial Quests, with walks and stays chosen by hand: the User sets out from S at 13:50, their next
// item is at N at 17:00, and with none the order ends at 18:00, unless a test says otherwise. Each stop takes 10
// minutes unless it says otherwise.

const DAY = '2026-11-17';

const at = (clock: string): Date => onDay(DAY, clock);

type Walks = (from: string, to: string) => number;

// Minutes on foot between two places, the same both ways.
function table(minutes: Record<string, number>): Walks {
  return (from, to) => {
    if (from === to) {
      return 0;
    }
    const found = minutes[`${from}${to}`] ?? minutes[`${to}${from}`];
    if (found === undefined) {
      throw new Error(`No walk between ${from} and ${to}`);
    }
    return found;
  };
}

const stop = (key: string, more: Partial<Stop> = {}): Stop => ({
  key,
  placeId: key,
  stayMinutes: 10,
  open: null,
  ...more,
});

// Minutes on foot between places on a line, at these positions.
function line(positions: Record<string, number>): Walks {
  return (from, to) => Math.abs((positions[from] ?? Number.NaN) - (positions[to] ?? Number.NaN));
}

interface When {
  from?: string;
  until?: string | null;
  // Null for a next item without a Place.
  untilPlace?: string | null;
}

function order(
  stops: Stop[],
  walkMinutes: Walks,
  { from = '13:50', until = '17:00', untilPlace = 'N' }: When = {},
): Order {
  return orderOf({
    from: { placeId: 'S', at: at(from) },
    until: until === null ? null : { placeId: untilPlace, at: at(until) },
    closing: at('18:00'),
    stops,
    walkMinutes,
  });
}

const visited = ({ visits }: Order): [string, string][] =>
  visits.map(({ stop: { key }, start }) => [key, clockOf(start)]);

const leftOut = ({ left }: Order): [string, string][] => left.map(({ stop: { key }, reason }) => [key, reason]);

describe('The order of three quests that all fit', () => {
  it('is the one that ends earliest, which is not the nearest stop first', () => {
    const found = order([stop('A'), stop('B'), stop('C')], line({ S: 0, A: 1, B: -2, C: 3, N: 4 }));

    expect(visited(found)).toEqual([
      ['B', '13:52'],
      ['A', '14:05'],
      ['C', '14:17'],
    ]);
    expect(found).toMatchObject({ walkMinutes: 8, onwardMinutes: 1, left: [] });
  });

  it('is, among those that end together, the one with the shorter walk on', () => {
    const found = order([stop('B'), stop('A')], table({ SA: 1, SB: 1, SN: 1, AB: 1, AN: 5, BN: 1 }));

    expect(visited(found)).toEqual([
      ['A', '13:51'],
      ['B', '14:02'],
    ]);
    expect(found.walkMinutes).toBe(3);
  });
});

describe('An office open twice a day', () => {
  // C closes at 12:00 and opens again at 13:30; A has no hours.
  const twice = stop('C', {
    open: [
      { from: at('09:00'), until: at('12:00') },
      { from: at('13:30'), until: at('17:30') },
    ],
  });

  it('is waited for when it fits only in its second opening, and the order that ends earliest wins over a shorter walk', () => {
    const found = order([twice, stop('A')], table({ SA: 5, SC: 1, SN: 1, AC: 5, AN: 1, CN: 1 }), { from: '11:50' });

    expect(visited(found)).toEqual([
      ['A', '11:55'],
      ['C', '13:30'],
    ]);
    expect(clockOf(found.visits[1]?.arrival ?? at('00:00'))).toBe('12:10');
  });
});

describe('A quest that does not fit before the next item', () => {
  it('is left out for want of time, and the one that fits with the shorter walk is kept', () => {
    const walks = table({ SA: 1, SB: 4, SN: 3, AB: 6, AN: 1, BN: 6 });

    const found = order([stop('A', { stayMinutes: 30 }), stop('B', { stayMinutes: 30 })], walks, { until: '14:30' });

    expect(visited(found)).toEqual([['A', '13:51']]);
    expect(leftOut(found)).toEqual([['B', 'no-time']]);
  });
});

describe('An office with hours', () => {
  const walks = table({ SA: 1, SC: 2, SN: 2, AC: 1, AN: 1, CN: 1 });

  it('is left out as already closed when its hours ended before the User could be there', () => {
    const closed = stop('C', { open: [{ from: at('09:00'), until: at('12:00') }] });

    const found = order([stop('A'), closed], walks);

    expect(visited(found)).toEqual([['A', '13:51']]);
    expect(leftOut(found)).toEqual([['C', 'closed-already']]);
  });

  it('is left out as closed today when it has no hours that day', () => {
    const found = order([stop('A'), stop('C', { open: [] })], walks);

    expect(leftOut(found)).toEqual([['C', 'closed-today']]);
  });

  it('is left out as already closed when it closes before the walk gets there', () => {
    const found = order(
      [stop('A'), stop('C', { open: [{ from: at('09:00'), until: at('14:00') }] })],
      table({ SA: 1, SC: 15, SN: 1, AC: 15, AN: 1, CN: 1 }),
    );

    expect(visited(found)).toEqual([['A', '13:51']]);
    expect(leftOut(found)).toEqual([['C', 'closed-already']]);
  });

  it('is waited for when the User is there before it opens', () => {
    const found = order([stop('A', { open: [{ from: at('14:00'), until: at('17:00') }] })], walks);

    expect(visited(found)).toEqual([['A', '14:00']]);
    expect(clockOf(found.visits[0]?.arrival ?? at('00:00'))).toBe('13:51');
  });
});

// A minute between any two places but F, which is far from every other.
const farF: Walks = (from, to) => {
  if (from === to) {
    return 0;
  }
  return from === 'F' || to === 'F' ? 9 : 1;
};

describe('Six quests that all fit', () => {
  it('are ordered five at most, the sixth left out as one too many', () => {
    const found = order(
      ['A', 'B', 'C', 'D', 'E', 'F'].map((key) => stop(key)),
      farF,
    );

    expect(visited(found).map(([key]) => key)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(found.walkMinutes).toBe(6);
    expect(leftOut(found)).toEqual([['F', 'more']]);
  });
});

describe('A gap shorter than one stop', () => {
  it('leaves every quest out for want of time, an open office too', () => {
    const open = stop('C', { open: [{ from: at('09:00'), until: at('18:00') }] });

    const found = order([stop('A'), open], table({ SA: 1, SC: 1, SN: 1, AC: 1, AN: 1, CN: 1 }), { until: '13:55' });

    expect(visited(found)).toEqual([]);
    expect(leftOut(found)).toEqual([
      ['A', 'no-time'],
      ['C', 'no-time'],
    ]);
  });
});

describe('A next item without a Place', () => {
  it('ends the order with no walk on to it', () => {
    const found = order([stop('A', { stayMinutes: 30 })], table({ SA: 1 }), { until: '14:30', untilPlace: null });

    expect(visited(found)).toEqual([['A', '13:51']]);
    expect(found).toMatchObject({ walkMinutes: 1, onwardMinutes: null });
  });
});

describe('A day with no next item', () => {
  it('counts no walk on', () => {
    const found = order([stop('B'), stop('A')], table({ SA: 1, SB: 2, AB: 1 }), { until: null });

    expect(visited(found)).toEqual([
      ['A', '13:51'],
      ['B', '14:02'],
    ]);
    expect(found).toMatchObject({ walkMinutes: 2, onwardMinutes: null });
  });
});
