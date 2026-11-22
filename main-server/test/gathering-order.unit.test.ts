/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { gather, type GatheringPerson, type GatheringPlace } from '../src/assistant/gathering/gathering.js';
import { at, free, item, person, place, walks, window } from './gathering-fixtures.js';

// The order of a gathering's plans (P05 ticket 32). A meal's: once everyone has a meal's time there, the least walking
// first, to the place and on to each one's next item, for everyone together; the largest single walk breaks a tie, then
// the earlier start, then the key. A meet's: the longest time together first.

const when = { window, now: at('11:30') };

// Free from that time to the end of lunch, after a Class at that Place.
const ready = (id: string, clock: string, placeId: string): GatheringPerson =>
  person(id, [free(clock, '14:30', item('11:00', clock, placeId), null)]);

describe('The order of a meal’s plans', () => {
  // From A at 12:00 to the next Class at B at 14:00. N is a minute from each and closes at 12:30; F is 15 minutes from
  // each and serves to 14:30.
  const travel = walks(['A', 'N', 60], ['N', 'B', 60], ['A', 'F', 900], ['F', 'B', 900]);
  const asker = person('me', [free('12:00', '14:00', item('11:00', '12:00', 'A'), item('14:00', '15:00', 'B'))]);
  const near = { ...place('near', 'N'), window: { start: at('11:00'), end: at('12:30') } };

  it('puts the place with the least walking first, though another gives longer together', () => {
    const { fits } = gather([asker], [place('far', 'F'), near], when, travel);

    expect(fits.map(({ key, togetherMinutes }) => [key, togetherMinutes])).toEqual([
      ['near', 29],
      ['far', 90],
    ]);
  });

  it('counts the walk on to the next item as well as the walk there', () => {
    // M is a minute from A but 20 from B; G is 5 from each and closes at 13:00.
    const onward = walks(['A', 'M', 60], ['M', 'B', 1200], ['A', 'G', 300], ['G', 'B', 300]);
    const g = { ...place('g', 'G'), window: { start: at('11:00'), end: at('13:00') } };

    const { fits } = gather([asker], [place('m', 'M'), g], when, onward);

    expect(fits.map(({ key, togetherMinutes }) => [key, togetherMinutes])).toEqual([
      ['g', 55],
      ['m', 99],
    ]);
  });

  it('for a meet, keeps the longest time together first', () => {
    const { fits } = gather([asker], [place('far', 'F'), near], when, travel, { order: 'together' });

    expect(fits.map(({ key }) => key)).toEqual(['far', 'near']);
  });
});

describe('The order of a meal’s plans with a Friend', () => {
  // Nothing after, the asker ready at 12:10 at A and the Friend at 12:00 at C, too far apart to meet on the way. X is
  // 2 minutes from A and 8 from C; Y 5 from each; W 1 from A and 12 from C.
  const travel = walks(
    ['A', 'X', 120],
    ['C', 'X', 480],
    ['A', 'Y', 300],
    ['C', 'Y', 300],
    ['A', 'W', 60],
    ['C', 'W', 720],
    ['C', 'A', 1200],
  );
  const keysOf = (places: GatheringPlace[]): string[] =>
    gather([ready('me', '12:10', 'A'), ready('friend', '12:00', 'C')], places, when, travel).fits.map(({ key }) => key);

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
  const travel = walks(['A', 'P', 60], ['P', 'B', 180], ['A', 'R', 120], ['R', 'B', 120]);
  const asker = person('me', [free('12:00', '13:00', item('11:00', '12:00', 'A'), item('13:00', '14:00', 'B'))]);
  const keysOf = (places: GatheringPlace[]): string[] =>
    gather([asker], places, when, travel).fits.map(({ key }) => key);

  it('puts the earlier start first when the walking ties', () => {
    expect(keysOf([place('alpha', 'R'), place('beta', 'P')])).toEqual(['beta', 'alpha']);
  });

  it('puts the keys in code-point order when the walking and the start tie', () => {
    expect(keysOf([place('b', 'P'), place('a', 'P')])).toEqual(['a', 'b']);
  });
});
