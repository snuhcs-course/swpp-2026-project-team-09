/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { gather, type GatheringMember, type GatheringPlace } from '../src/assistant/gathering/gathering.js';
import { at, free, item, member, place, walks, window } from './gathering-fixtures.js';

describe('Shared time', () => {
  const travel = walks(['A', 'P', 60]);

  it('gives nothing when the people share no time in the window', () => {
    const asker = member('me', [free('11:00', '12:00', null, null)]);
    const friend = member('friend', [free('13:00', '14:00', null, null)]);

    expect(gather([asker, friend], [place('cafe', 'A')], { window, now: at('10:00') }, travel)).toEqual({
      shared: null,
      fits: [],
      dropped: [],
    });
  });

  it('plans in a later stretch when nothing fits in the first one', () => {
    const asker = member('me', [
      free('11:00', '11:10', null, item('11:10', '12:00', 'A')),
      free('12:00', '14:30', item('11:10', '12:00', 'A'), null),
    ]);

    const { shared, fits, dropped } = gather([asker], [place('cafe', 'P')], { window, now: at('10:00') }, travel);

    expect(shared).toEqual({ start: at('12:00'), end: at('14:30') });
    expect(fits).toMatchObject([{ key: 'cafe', start: at('12:01'), end: at('14:30') }]);
    expect(dropped).toEqual([]);
  });
});

describe('Minutes on foot', () => {
  const travel = walks(['A', 'P', 60], ['A', 'Q', 61], ['A', 'A', 300]);
  const asker = member('me', [free('12:00', '14:30', item('11:00', '12:00', 'A'), null)]);
  const walkTo = (placeId: string): number | null =>
    gather([asker], [place('cafe', placeId)], { window, now: at('11:30') }, travel).fits[0]?.parts[0]?.walkMinutes ??
    null;

  it('counts a walk of 60 seconds as 1 minute', () => {
    expect(walkTo('P')).toBe(1);
  });

  it('counts a walk of 61 seconds as 2 minutes', () => {
    expect(walkTo('Q')).toBe(2);
  });

  it('counts a walk inside one Place as 0 minutes, whatever the table says', () => {
    expect(walkTo('A')).toBe(0);
  });
});

describe('Where a member sets out from', () => {
  const travel = walks(['A', 'P', 60], ['L', 'P', 120]);
  const originOf = (asker: GatheringMember, now: string): object | null =>
    gather([asker], [place('cafe', 'P')], { window, now: at(now) }, travel).fits[0]?.parts[0]?.origin ?? null;

  it('is the Place of the Class they are busy with until the stretch starts', () => {
    const asker = member('me', [free('12:00', '14:30', item('11:00', '12:00', 'A'), null)], 'L');

    expect(originOf(asker, '11:30')).toEqual({ placeId: 'A', basis: 'timetable' });
  });

  it('is their location when they are free now, even when a Class ended a minute ago', () => {
    const asker = member('me', [free('12:00', '14:30', item('11:00', '11:59', 'A'), null)], 'L');

    expect(originOf(asker, '12:00')).toEqual({ placeId: 'L', basis: 'location' });
  });

  it('is the Place of a Class that ended 15 minutes ago when they are free now without a location', () => {
    const asker = member('me', [free('12:00', '14:30', item('11:00', '11:45', 'A'), null)]);

    expect(originOf(asker, '12:00')).toEqual({ placeId: 'A', basis: 'timetable' });
  });

  it('is unknown when the Class ended 16 minutes ago', () => {
    const asker = member('me', [free('12:00', '14:30', item('11:00', '11:44', 'A'), null)]);

    expect(originOf(asker, '12:00')).toBeNull();
  });

  it('is unknown when no item came before', () => {
    const asker = member('me', [free('12:00', '14:30', null, null)]);

    expect(originOf(asker, '12:00')).toBeNull();
  });
});

describe('A member', () => {
  const travel = walks(['A', 'P', 300], ['B', 'P', 120], ['A', 'B', 600]);
  const asker = member('me', [free('12:00', '14:30', item('11:00', '12:00', 'A'), null)]);

  it('sets out at the latest time that still has them there at the start', () => {
    const friend = member('friend', [free('12:10', '14:30', item('11:00', '12:10', 'B'), null)]);

    const [fit] = gather([asker, friend], [place('cafe', 'P')], { window, now: at('11:30') }, travel).fits;

    expect(fit?.start).toEqual(at('12:12'));
    expect(fit?.parts).toMatchObject([
      { memberId: 'me', walkMinutes: 5, arriveAt: at('12:05'), leaveAt: at('12:07') },
      { memberId: 'friend', walkMinutes: 2, arriveAt: at('12:12'), leaveAt: at('12:10') },
    ]);
  });

  it('whose origin is unknown has no walk and counts from when they are ready, their next item still limiting', () => {
    const friend = member('friend', [free('12:20', '13:00', null, item('13:00', '14:00', 'B'))]);

    const [fit] = gather([asker, friend], [place('cafe', 'P')], { window, now: at('11:30') }, travel).fits;

    expect(fit).toMatchObject({ start: at('12:20'), end: at('12:58') });
    expect(fit?.parts[1]).toMatchObject({ origin: null, walkMinutes: null, arriveAt: null, leaveAt: null });
  });

  it('reaches a next item without a Place at its start', () => {
    const busy = member('me', [free('12:00', '13:00', item('11:00', '12:00', 'A'), item('13:00', '14:00', null))]);

    const [fit] = gather([busy], [place('cafe', 'P')], { window, now: at('11:30') }, travel).fits;

    expect(fit?.end).toEqual(at('13:00'));
    expect(fit?.parts[0]?.leaveBy).toEqual(at('13:00'));
  });

  it('with nothing after has no leave-by, and the window closing ends the plan', () => {
    const [fit] = gather([asker], [place('cafe', 'P')], { window, now: at('11:30') }, travel).fits;

    expect(fit?.end).toEqual(at('14:30'));
    expect(fit?.parts[0]).toMatchObject({ leaveBy: null, next: null });
  });

  it('arriving before the window opens has the plan start when it opens', () => {
    const early = member('me', [free('10:00', '14:30', item('09:00', '10:00', 'A'), null)]);

    const [fit] = gather([early], [place('cafe', 'P')], { window, now: at('09:30') }, travel).fits;

    expect(fit?.start).toEqual(at('11:00'));
    expect(fit?.parts[0]?.arriveAt).toEqual(at('10:05'));
  });
});

// Class at A until 12:00, the next at A, the place P a minute away.
const alone = (nextStart: string): GatheringMember =>
  member('me', [free('12:00', nextStart, item('11:00', '12:00', 'A'), item(nextStart, '13:00', 'A'))]);

describe('Time together', () => {
  const travel = walks(['A', 'P', 60]);

  it('fits for exactly 15 minutes together', () => {
    const { fits } = gather([alone('12:17')], [place('cafe', 'P')], { window, now: at('11:30') }, travel);

    expect(fits).toMatchObject([{ key: 'cafe', start: at('12:01'), end: at('12:16'), togetherMinutes: 15 }]);
  });

  it('drops a place with 14 minutes together, naming who could stay the shortest', () => {
    const { fits, dropped } = gather([alone('12:16')], [place('cafe', 'P')], { window, now: at('11:30') }, travel);

    expect(fits).toEqual([]);
    expect(dropped).toEqual([
      { key: 'cafe', placeId: 'P', togetherMinutes: 14, shortest: { memberId: 'me', minutes: 14 } },
    ]);
  });
});

describe('The order of the plans', () => {
  // From A at 12:00 to the next Class at B at 13:00: P is 1 minute in and 3 out, R 2 in and 2 out.
  const travel = walks(['A', 'P', 60], ['P', 'B', 180], ['A', 'R', 120], ['R', 'B', 120]);
  const asker = member('me', [free('12:00', '13:00', item('11:00', '12:00', 'A'), item('13:00', '14:00', 'B'))]);
  const keysOf = (places: GatheringPlace[]): string[] =>
    gather([asker], places, { window, now: at('11:30') }, travel).fits.map(({ key }) => key);

  it('puts the earlier start first when the minutes together tie', () => {
    expect(keysOf([place('alpha', 'R'), place('beta', 'P')])).toEqual(['beta', 'alpha']);
  });

  it('puts the keys in code-point order when the minutes and the start tie', () => {
    expect(keysOf([place('b', 'P'), place('a', 'P')])).toEqual(['a', 'b']);
  });
});

describe('Nobody on time', () => {
  const travel = walks(['A', 'P', 60], ['A', 'R', 120]);
  const first = item('12:14', '14:20', 'A');
  const asker = member('me', [
    free('12:00', '12:14', item('11:00', '12:00', 'A'), first),
    free('14:20', '14:30', first, null),
  ]);

  it('fits nothing, keeps the first stretch and drops every place in the order given', () => {
    expect(gather([asker], [place('r', 'R'), place('p', 'P')], { window, now: at('11:30') }, travel)).toEqual({
      shared: { start: at('12:00'), end: at('12:14') },
      fits: [],
      dropped: [
        { key: 'r', placeId: 'R', togetherMinutes: 10, shortest: { memberId: 'me', minutes: 10 } },
        { key: 'p', placeId: 'P', togetherMinutes: 12, shortest: { memberId: 'me', minutes: 12 } },
      ],
    });
  });
});

// Everyone is ready at 12:00. Going by S takes a Friend at O 3 + 5 minutes to P, against 7 straight, and 3 + 5 to D,
// against 6 straight; a Friend at T 6 + 5 to P, against 10. Q is a minute from O on the way to E, far from S.
const throughS = walks(
  ['O', 'S', 180],
  ['S', 'P', 300],
  ['O', 'P', 420],
  ['S', 'D', 300],
  ['O', 'D', 360],
  ['T', 'S', 360],
  ['T', 'P', 600],
  ['Q', 'O', 60],
  ['Q', 'E', 300],
  ['O', 'E', 240],
  ['S', 'E', 600],
  ['Q', 'S', 600],
  ['Z', 'S', 0],
);
const ready = (id: string, placeId: string | null): GatheringMember =>
  member(id, [free('12:00', '14:30', placeId === null ? null : item('11:00', '12:00', placeId), null)]);
const early = (id: string, placeId: string): GatheringMember =>
  member(id, [free('10:00', '14:30', item('09:00', '10:00', placeId), null)]);
const plan = (members: [GatheringMember, ...GatheringMember[]], placeId: string): object | undefined =>
  gather(members, [place('cafe', placeId)], { window, now: at('11:30') }, throughS).fits[0];

describe('The merging point', () => {
  it('is the asker’s origin when going by it takes the Friend 1 minute longer', () => {
    expect(plan([ready('me', 'S'), ready('friend', 'O')], 'P')).toMatchObject({
      start: at('12:08'),
      meeting: { placeId: 'S', at: at('12:03'), memberIds: ['me', 'friend'] },
      parts: [
        { walkMinutes: 5, arriveAt: at('12:08'), leaveAt: at('12:03') },
        { walkMinutes: 8, arriveAt: at('12:08'), leaveAt: at('12:00') },
      ],
    });
  });

  it('with two merging Friends has them set out when the later one is there', () => {
    expect(plan([ready('me', 'S'), ready('near', 'O'), ready('far', 'T')], 'P')).toMatchObject({
      start: at('12:11'),
      meeting: { placeId: 'S', at: at('12:06'), memberIds: ['me', 'near', 'far'] },
      parts: [
        { walkMinutes: 5, arriveAt: at('12:11'), leaveAt: at('12:06') },
        { walkMinutes: 8, arriveAt: at('12:11'), leaveAt: at('12:03') },
        { walkMinutes: 11, arriveAt: at('12:11'), leaveAt: at('12:00') },
      ],
    });
  });

  it('is met as late as still has them there at the start, when the start waits for the window to open', () => {
    const when = { window, now: at('09:30') };

    expect(
      gather([early('me', 'S'), early('friend', 'O')], [place('cafe', 'P')], when, throughS).fits[0],
    ).toMatchObject({
      start: at('11:00'),
      meeting: { placeId: 'S', at: at('10:55') },
      parts: [
        { walkMinutes: 5, arriveAt: at('10:08'), leaveAt: at('10:55') },
        { walkMinutes: 8, arriveAt: at('10:08'), leaveAt: at('10:52') },
      ],
    });
  });
});

describe('No merging point', () => {
  it('is not there when going by the asker’s origin takes the Friend 2 minutes longer', () => {
    expect(plan([ready('me', 'S'), ready('friend', 'O')], 'D')).toMatchObject({
      start: at('12:06'),
      meeting: null,
      parts: [
        { walkMinutes: 5, leaveAt: at('12:01') },
        { walkMinutes: 6, leaveAt: at('12:00') },
      ],
    });
  });

  it('is not there when the place stands at the asker’s origin', () => {
    expect(plan([ready('me', 'S'), ready('friend', 'O')], 'S')).toMatchObject({ meeting: null });
  });

  it('is not there when the place stands at the Friend’s origin', () => {
    // Z is so close to S that going by S would cost the Friend nothing.
    expect(plan([ready('me', 'S'), ready('friend', 'Z')], 'Z')).toMatchObject({ meeting: null });
  });

  it('is not there when the asker’s origin is unknown', () => {
    expect(plan([ready('me', null), ready('friend', 'O')], 'P')).toMatchObject({ meeting: null });
  });

  it('is never between two Friends', () => {
    expect(plan([ready('me', 'S'), ready('one', 'O'), ready('two', 'Q')], 'E')).toMatchObject({ meeting: null });
  });
});
