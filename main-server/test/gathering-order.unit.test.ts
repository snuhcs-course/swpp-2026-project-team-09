/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type Gathering,
  gather,
  type GatheringPerson,
  type GatheringPlace,
} from '../src/assistant/gathering/gathering.js';
import { at, free, item, person, place, walks, window } from './gathering-fixtures.js';

// The order of a gathering's plans (P05 ticket 32). A meal's: those where everyone has 30 minutes first, then those with
// 15 to 30; in each, the least walking first, to the place and on to each one's next item, for everyone together; the
// largest single walk breaks a tie, then the earlier start, then the key. A meet's: the longest time together first.

const when = { window, now: at('11:30') };

// Free from that time to the end of lunch, after a Class at that Place.
const ready = (id: string, clock: string, placeId: string): GatheringPerson =>
  person(id, [free(clock, '14:30', item('11:00', clock, placeId), null)]);

// From A at 12:00 to the next Class at B at 14:00. N is a minute from each; F is 15 minutes from each and serves to
// 14:30.
const travel = walks(['A', 'N', 60], ['N', 'B', 60], ['A', 'F', 900], ['F', 'B', 900]);
const asker = person('me', [free('12:00', '14:00', item('11:00', '12:00', 'A'), item('14:00', '15:00', 'B'))]);

// The place at that Place, serving from 11:00 to that time.
const closing = (key: string, placeId: string, clock: string): GatheringPlace => ({
  ...place(key, placeId),
  window: { start: at('11:00'), end: at(clock) },
});
const keysAndMinutes = ({ fits }: Gathering): [string, number][] =>
  fits.map(({ key, togetherMinutes }) => [key, togetherMinutes]);
const near = closing('near', 'N', '12:31');

describe('The order of a meal’s plans', () => {
  it('puts the place with the least walking first, though another gives longer together', () => {
    expect(keysAndMinutes(gather([asker], [place('far', 'F'), near], when, travel))).toEqual([
      ['near', 30],
      ['far', 90],
    ]);
  });

  it('counts the walk on to the next item as well as the walk there', () => {
    // M is a minute from A but 20 from B; G is 5 from each and closes at 13:00.
    const onward = walks(['A', 'M', 60], ['M', 'B', 1200], ['A', 'G', 300], ['G', 'B', 300]);

    const gathering = gather([asker], [place('m', 'M'), closing('g', 'G', '13:00')], when, onward);

    expect(keysAndMinutes(gathering)).toEqual([
      ['g', 55],
      ['m', 99],
    ]);
  });

  it('for a meet, keeps the longest time together first', () => {
    const { fits } = gather([asker], [place('far', 'F'), near], when, travel, { order: 'together' });

    expect(fits.map(({ key }) => key)).toEqual(['far', 'near']);
  });
});

describe('The order of a meal’s plans with under 30 minutes', () => {
  it('puts a place with under 30 minutes after one with 30, however near', () => {
    const gathering = gather([asker], [closing('hurried', 'N', '12:21'), place('far', 'F')], when, travel);

    expect(keysAndMinutes(gathering)).toEqual([
      ['far', 90],
      ['hurried', 20],
    ]);
  });

  it('orders the places with under 30 minutes by their walking too', () => {
    // H is 2 minutes from each and closes at 12:28, giving 2 minutes more than N.
    const more = walks(['A', 'N', 60], ['N', 'B', 60], ['A', 'H', 120], ['H', 'B', 120]);

    const gathering = gather([asker], [closing('h', 'H', '12:28'), closing('n', 'N', '12:25')], when, more);

    expect(keysAndMinutes(gathering)).toEqual([
      ['n', 24],
      ['h', 26],
    ]);
  });
});

describe('The order of a meal’s plans with a Friend', () => {
  // Nothing after, the asker ready at 12:10 at A and the Friend at 12:00 at C, too far apart to meet on the way. X is
  // 2 minutes from A and 8 from C; Y 5 from each; W 1 from A and 12 from C.
  const apart = walks(
    ['A', 'X', 120],
    ['C', 'X', 480],
    ['A', 'Y', 300],
    ['C', 'Y', 300],
    ['A', 'W', 60],
    ['C', 'W', 720],
    ['C', 'A', 1200],
  );
  const keysOf = (places: GatheringPlace[]): string[] =>
    gather([ready('me', '12:10', 'A'), ready('friend', '12:00', 'C')], places, when, apart).fits.map(({ key }) => key);

  it('puts the least walking for both together first, whoever walks it', () => {
    expect(keysOf([place('w', 'W'), place('y', 'Y')])).toEqual(['y', 'w']);
  });

  // X starts at 12:12 and Y at 12:15, the asker arriving last at each.
  it('puts the smaller largest walk first when the walking together ties, before the earlier start', () => {
    expect(keysOf([place('x', 'X'), place('y', 'Y')])).toEqual(['y', 'x']);
  });
});

describe('The order of a meal’s plans on a tie', () => {
  // From A at 12:00 to the next Class at B at 13:00: P is 1 minute in and 3 out, R 2 in and 2 out.
  const tied = walks(['A', 'P', 60], ['P', 'B', 180], ['A', 'R', 120], ['R', 'B', 120]);
  const freeUntilOne = person('me', [free('12:00', '13:00', item('11:00', '12:00', 'A'), item('13:00', '14:00', 'B'))]);
  const keysOf = (places: GatheringPlace[]): string[] =>
    gather([freeUntilOne], places, when, tied).fits.map(({ key }) => key);

  it('puts the earlier start first when the walking ties', () => {
    expect(keysOf([place('alpha', 'R'), place('beta', 'P')])).toEqual(['beta', 'alpha']);
  });

  it('puts the keys in code-point order when the walking and the start tie', () => {
    expect(keysOf([place('b', 'P'), place('a', 'P')])).toEqual(['a', 'b']);
  });
});

// A place serving from one time to another.
const serving = (key: string, placeId: string, from: string, until: string): GatheringPlace => ({
  ...place(key, placeId),
  window: { start: at(from), end: at(until) },
});

// P05 ticket 40: the asker's origin unknown, as for a later day with no item before the meal. Partitions: nothing after
// the meal; a next item whose Place is known; the words the model is given for each, and none with an origin.
describe('The order of a meal’s plans without the asker’s origin', () => {
  it('puts the earliest start first, then the longest time to eat, never the name', () => {
    const unplaced = person('me', [free('12:00', '14:30', null, null)]);
    const places = [
      serving('aa', 'P', '12:30', '14:30'),
      serving('yy', 'Q', '11:00', '14:00'),
      serving('zz', 'R', '11:00', '14:30'),
    ];

    const { fits } = gather([unplaced], places, when, walks());

    expect(fits.map(({ key, parts }) => [key, parts[0]?.origin ?? null])).toEqual([
      ['zz', null],
      ['yy', null],
      ['aa', null],
    ]);
  });

  // As before this ticket: the walk on is known without the origin.
  it('puts the least walking on to the next item first when its Place is known', () => {
    const beforeClass = person('me', [free('12:00', '14:00', null, item('14:00', '15:00', 'B'))]);
    const onward = walks(['P', 'B', 180], ['R', 'B', 120]);

    const { fits } = gather([beforeClass], [place('p', 'P'), place('r', 'R')], when, onward);

    expect(fits.map(({ key }) => key)).toEqual(['r', 'p']);
  });
});
