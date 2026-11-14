/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MENU_LOOKUP } from '@/api/mock/data/menu-lookup';
import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { isLookup } from '@/api/server/plan-answers';

const { chips: _chips, ...withoutChips } = WAY_LOOKUP;

// The app's check of a reply's Lookup, on the stored copies of the main server's Lookups for "문화관이 어디야?" (board
// q1) and "오늘 301동식당 메뉴 뭐야?" (board q8). Expected values: the stored replies, and copies of one with one part
// broken.
describe('the check of a Lookup', () => {
  it('passes the stored copy of a real Lookup', () => {
    expect(isLookup(WAY_LOOKUP)).toBe(true);
  });

  it('passes the stored copy of a real menu Lookup, with its time band', () => {
    expect(isLookup(MENU_LOOKUP)).toBe(true);
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
  ])('refuses a Lookup %s', (_, lookup) => {
    expect(isLookup(lookup)).toBe(false);
  });
});
