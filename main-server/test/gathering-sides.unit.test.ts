/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { gather } from '../src/assistant/gathering/gathering.js';
import { at, free, item, person, place, walks, window } from './gathering-fixtures.js';

// Each person's side of the stretch a plan lies in, and the walk on to their next item.

const travel = walks(['A', 'P', 300], ['B', 'P', 120], ['A', 'B', 600]);
const when = { window, now: at('11:30') };

describe("Each person's side", () => {
  it('is given in a plan, in the order of the people', () => {
    const asker = person('me', [free('12:00', '14:30', item('11:00', '12:00', 'A'), null)]);
    const friend = person('friend', [free('12:10', '14:30', item('11:00', '12:10', 'B'), null)]);

    expect(gather([asker, friend], [place('cafe', 'P')], when, travel).sides).toEqual([
      { personId: 'me', readyAt: at('12:00'), origin: { placeId: 'A', basis: 'timetable' }, next: null },
      { personId: 'friend', readyAt: at('12:10'), origin: { placeId: 'B', basis: 'timetable' }, next: null },
    ]);
  });

  it('is given when nothing fits', () => {
    const asker = person('me', [free('12:00', '12:16', item('11:00', '12:00', 'A'), item('12:16', '13:00', 'A'))]);

    const { fits, sides } = gather([asker], [place('cafe', 'P')], when, travel);

    expect(fits).toEqual([]);
    expect(sides).toEqual([
      {
        personId: 'me',
        readyAt: at('12:00'),
        origin: { placeId: 'A', basis: 'timetable' },
        next: { start: at('12:16'), placeId: 'A' },
      },
    ]);
  });

  it('is empty when the people share no time', () => {
    const asker = person('me', [free('11:00', '12:00', null, null)]);
    const friend = person('friend', [free('13:00', '14:00', null, null)]);

    expect(gather([asker, friend], [place('cafe', 'P')], when, travel).sides).toEqual([]);
  });
});

describe('The walk on to the next item', () => {
  it('is the walk from the place to the Place of the next item, the leave-by following from it', () => {
    const asker = person('me', [free('12:00', '13:00', item('11:00', '12:00', 'A'), item('13:00', '14:00', 'B'))]);

    const [fit] = gather([asker], [place('cafe', 'P')], when, travel).fits;

    expect(fit?.parts[0]).toMatchObject({
      leaveBy: at('12:58'),
      next: { start: at('13:00'), placeId: 'B', walkMinutes: 2 },
    });
  });

  it('is null when the next item has no Place', () => {
    const asker = person('me', [free('12:00', '13:00', item('11:00', '12:00', 'A'), item('13:00', '14:00', null))]);

    const [fit] = gather([asker], [place('cafe', 'P')], when, travel).fits;

    expect(fit?.parts[0]).toMatchObject({
      leaveBy: at('13:00'),
      next: { start: at('13:00'), placeId: null, walkMinutes: null },
    });
  });
});
