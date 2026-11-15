/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { STUDY_LOOKUP } from '@/api/mock/data/study-lookup';
import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { isLookup } from '@/api/server/lookup-answers';

// The app's check of the study spaces of the visible area (board a9), on the stored copy of the main server's Lookup:
// its kind, the chips of the area and of the kind asked, and the flag at the area's edge with the Place it points to.
// Expected values: the stored copy, and copies of it with one part changed.

const { scene } = STUDY_LOOKUP;
const away = scene.flags.find(({ role }) => role === 'away');

describe('the check of a study Lookup', () => {
  it('passes the stored copy of the real Lookup of board a9', () => {
    expect(isLookup(STUDY_LOOKUP)).toBe(true);
  });

  it('holds the chips of the area and of the kind asked, and a flag towards 관정 with its Place', () => {
    expect(STUDY_LOOKUP.chips.map(({ kind }) => kind)).toEqual(['origin', 'until', 'area', 'what']);
    expect(away?.text).toBe('↑ 관정');
    expect(typeof away?.placeId).toBe('string');
  });

  it('passes a flag of an older main server, without a Place', () => {
    const [flag] = WAY_LOOKUP.scene.flags;

    expect(isLookup({ ...WAY_LOOKUP, scene: { ...WAY_LOOKUP.scene, flags: [flag] } })).toBe(true);
    expect(flag).not.toHaveProperty('placeId');
  });

  it.each([
    ['a chip of an unknown kind', { ...STUDY_LOOKUP, chips: [{ kind: 'map', text: '보는 범위', userId: null }] }],
    ['a flag whose Place is not an id', { ...STUDY_LOOKUP, scene: { ...scene, flags: [{ ...away, placeId: 62 }] } }],
    ['a flag of an unknown role', { ...STUDY_LOOKUP, scene: { ...scene, flags: [{ ...away, role: 'edge' }] } }],
  ])('refuses a study Lookup with %s', (_, lookup) => {
    expect(isLookup(lookup)).toBe(false);
  });
});
