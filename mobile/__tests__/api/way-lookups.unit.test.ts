/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FRIEND_LOOKUP } from '@/api/mock/data/friend-lookup';
import { MENU_LOOKUP } from '@/api/mock/data/menu-lookup';
import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { isLookup } from '@/api/server/lookup-answers';
import late from '../fixtures/way-lookups/late.json';
import leave from '../fixtures/way-lookups/leave.json';
import shuttle from '../fixtures/way-lookups/shuttle.json';

const { chips: _chips, ...withoutChips } = WAY_LOOKUP;

const [FRIEND] = FRIEND_LOOKUP.scene.people;

// Copies of the main server's Lookups, written by its `wayAnswer` over the seed's Places, walking table, shuttle
// timing, and stops, for the User of `way-lookup.ts` at 301동 on Tuesday 2026-11-17; a stop's id is its key in the
// seed, where the database gives it one. Expected values: each passes as the server wrote it.
describe('the check of real Lookups with a deadline or the shuttle', () => {
  it.each([
    ['12:40, leaving at 12:45 for the 13:00 Class in 24동 (board q2)', leave],
    ['12:50, 5 minutes late for it (board q3)', late],
    ['16:40, by the shuttle reported at 신소재공동연구소 to the 17:00 Class in 58동 (board q4)', shuttle],
  ])('passes the Lookup at %s', (_, lookup) => {
    expect(isLookup(lookup)).toBe(true);
  });
});

// The app's check of a reply's Lookup, on the stored copies of the main server's Lookups for "문화관이 어디야?" (board
// q1), "오늘 301동식당 메뉴 뭐야?" (board q8), and "민수 어디야?" (board q6). Expected values: the stored replies, and
// copies of one with one part changed.
describe('the check of a Lookup', () => {
  it('passes the stored copy of a real Lookup', () => {
    expect(isLookup(WAY_LOOKUP)).toBe(true);
  });

  it('passes a Lookup with a time band and a leave-by notification', () => {
    const band = {
      range: { startAt: '2026-11-17T12:30:00+09:00', endAt: '2026-11-17T13:00:00+09:00' },
      now: '2026-11-17T12:40:00+09:00',
      lanes: [{ userId: '11ca538e-e4ef-48d9-9a1f-b7160c553bee', name: '나', busy: [] }],
      startAt: '2026-11-17T12:45:00+09:00',
      endAt: '2026-11-17T13:00:00+09:00',
      text: '12:45 나서기 · 걸어서 15분',
    };
    const remind = { kind: 'remind', at: '2026-11-17T12:45:00+09:00', text: '지금 나서면 13:00 수업에 맞아요' };

    expect(isLookup({ ...WAY_LOOKUP, band, actions: [remind, ...WAY_LOOKUP.actions] })).toBe(true);
  });

  it.each([
    ['without its chips', withoutChips],
    ['of an unknown kind', { ...WAY_LOOKUP, kind: 'quest' }],
    ['with a band of another shape', { ...WAY_LOOKUP, band: { text: '12:45 나서기' } }],
    ['with an action of an unknown kind', { ...WAY_LOOKUP, actions: [{ kind: 'call', userId: 'u' }] }],
    ['with a guide to no Place', { ...WAY_LOOKUP, actions: [{ kind: 'guide' }] }],
    [
      'with a person of an unknown source',
      { ...FRIEND_LOOKUP, scene: { ...FRIEND_LOOKUP.scene, people: [{ ...FRIEND, source: 'room' }] } },
    ],
  ])('refuses a Lookup %s', (_, lookup) => {
    expect(isLookup(lookup)).toBe(false);
  });
});

describe('the check of a Lookup of each kind', () => {
  it('passes the stored copy of a real menu Lookup, with its time band', () => {
    expect(isLookup(MENU_LOOKUP)).toBe(true);
  });

  it('passes the stored copy of a real Friend Lookup, a Friend at the building he is in', () => {
    expect(isLookup(FRIEND_LOOKUP)).toBe(true);
  });

  it("passes a shuttle way's scene: a stop, the ride, the walk not taken, and the flags of setting out and being late", () => {
    const { scene } = WAY_LOOKUP;
    const [place] = scene.places;
    const [route] = scene.routes;
    const [flag] = scene.flags;
    if (place === undefined || route === undefined || flag === undefined) {
      throw new Error('The stored Lookup draws a Place, a route, and a flag');
    }
    const shuttleScene = {
      ...scene,
      places: [...scene.places, { ...place, role: 'stop' }],
      routes: [...scene.routes, { ...route, role: 'shuttle' }, { ...route, role: 'alt' }],
      flags: [
        { ...flag, role: 'leave' },
        { ...flag, role: 'late' },
        { ...flag, role: 'shuttle' },
      ],
    };

    expect(isLookup({ ...WAY_LOOKUP, scene: shuttleScene })).toBe(true);
  });
});
