/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf, endOfDay, onDay } from '../src/assistant/free-time/free-time.js';
import { type Order, orderOf, type Stop } from '../src/assistant/lookup/tutorial-order.js';

// The order of the Tutorial Quests, with walks and stays chosen by hand: the User sets out from S at 13:50, and their
// next item is at N at 17:00 unless a test says otherwise. Each stop takes 10 minutes unless it says otherwise.

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

function order(stops: Stop[], walkMinutes: Walks, until: string | null = '17:00'): Order {
  return orderOf({
    from: { placeId: 'S', at: at('13:50') },
    until: until === null ? null : { placeId: 'N', at: at(until) },
    dayEnd: endOfDay(DAY),
    stops,
    walkMinutes,
  });
}

const visited = ({ visits }: Order): [string, string][] =>
  visits.map(({ stop: { key }, start }) => [key, clockOf(start)]);

const leftOut = ({ left }: Order): [string, string][] => left.map(({ stop: { key }, reason }) => [key, reason]);

describe('The order of three quests that all fit', () => {
  // A is nearest the start and the next item, B and C are near each other.
  const walks = table({ SA: 1, SB: 4, SC: 5, SN: 3, AB: 6, AC: 6, BC: 1, AN: 1, BN: 6, CN: 6 });

  it('is the one with the shortest total walk, the walk on included, not the nearest stop first', () => {
    const found = order([stop('A'), stop('B'), stop('C')], walks);

    expect(visited(found)).toEqual([
      ['B', '13:54'],
      ['C', '14:05'],
      ['A', '14:21'],
    ]);
    expect(found).toMatchObject({ walkMinutes: 12, onwardMinutes: 1, left: [] });
  });
});

describe('A quest that does not fit before the next item', () => {
  it('is left out for want of time, and the one that fits with the shorter walk is kept', () => {
    const walks = table({ SA: 1, SB: 4, SN: 3, AB: 6, AN: 1, BN: 6 });

    const found = order([stop('A', { stayMinutes: 30 }), stop('B', { stayMinutes: 30 })], walks, '14:30');

    expect(visited(found)).toEqual([['A', '13:51']]);
    expect(leftOut(found)).toEqual([['B', 'no-time']]);
  });
});

describe('An office with hours', () => {
  const walks = table({ SA: 1, SC: 2, SN: 2, AC: 1, AN: 1, CN: 1 });

  it('is left out as closed when it does not open before the next item', () => {
    const closed = stop('C', { open: [{ from: at('09:00'), until: at('12:00') }] });

    const found = order([stop('A'), closed], walks);

    expect(visited(found)).toEqual([['A', '13:51']]);
    expect(leftOut(found)).toEqual([['C', 'closed']]);
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

describe('A day with no next item', () => {
  it('counts no walk on, and orders the stops by their own walk', () => {
    const found = order([stop('B'), stop('A')], table({ SA: 1, SB: 2, AB: 1 }), null);

    expect(visited(found)).toEqual([
      ['A', '13:51'],
      ['B', '14:02'],
    ]);
    expect(found).toMatchObject({ walkMinutes: 2, onwardMinutes: null });
  });
});
