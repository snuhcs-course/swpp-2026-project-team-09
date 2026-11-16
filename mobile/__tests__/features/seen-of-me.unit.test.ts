/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { friendView, ME, member, MIN_JUN, myParty, SEO_YEON } from '../support/map-sources';
import type { MyParty } from '@/api/types';
import { type SeenLevels, seenLevels } from '@/features/friends/seen-of-me';

// 김민준 with both ends of the friendship at the Timetable, so that only the Party can give more.
const MIN_JUN_TIMETABLE = friendView(MIN_JUN, { level: 'timetable', seen: 'timetable' });

// The User's Party with 김민준, the User's own switch for it on.
const LUNCH: MyParty = myParty(null, [member(ME, true), member(MIN_JUN, true)]);

const BY_PARTY: SeenLevels = { mine: 'exact', both: 'exact', inParty: true };
const TIMETABLE_ONLY: SeenLevels = { mine: 'timetable', both: 'timetable', inParty: false };

describe("seenLevels by the User's Party", () => {
  // Partitions: a Friend in the User's Party with the Party's switch and the Master Switch on; the Party's switch
  // off; the Master Switch off; a Friend who is not in the Party; no Party at all. The rule: the main server's
  // `levelSeen` (the exact position in a common Party, nothing above the Timetable while a Master Switch is off),
  // as tickets 19 (decisions 5 and 9) and 21 (decisions 7 and 11) say it.
  it('a member, both switches on → the exact position at both ends by the Party', () => {
    expect(seenLevels(MIN_JUN_TIMETABLE, { masterOn: true, party: LUNCH })).toEqual(BY_PARTY);
  });

  it("a member, the User's switch for the Party off → what the friendship gives", () => {
    const party = { ...LUNCH, sharing: false };

    expect(seenLevels(MIN_JUN_TIMETABLE, { masterOn: true, party })).toEqual(TIMETABLE_ONLY);
  });

  it('a member, the Master Switch off → the Timetable only, the Party too', () => {
    const friend = friendView(MIN_JUN, { level: 'exact', seen: 'timetable' });

    expect(seenLevels(friend, { masterOn: false, party: LUNCH })).toEqual(TIMETABLE_ONLY);
  });

  it('a Friend who is not in the Party → what the friendship gives', () => {
    const friend = friendView(SEO_YEON, { level: 'building', seen: 'building' });

    expect(seenLevels(friend, { masterOn: true, party: LUNCH })).toEqual({
      mine: 'building',
      both: 'building',
      inParty: false,
    });
  });

  it('no Party → what the friendship gives', () => {
    expect(seenLevels(MIN_JUN_TIMETABLE, { masterOn: true, party: null })).toEqual(TIMETABLE_ONLY);
  });
});

describe('seenLevels by the friendship', () => {
  // Partitions: `seen` below the User's end, and equal to it. The rule: ticket 21's decision 7, the two see the lower
  // of `seen` and the User's end.
  it.each([
    ['building', 'building'],
    ['exact', 'exact'],
  ] as const)('the User at exact, seen %s → the two see %s', (seen, both) => {
    const friend = friendView(MIN_JUN, { level: 'exact', seen });

    expect(seenLevels(friend, { masterOn: true, party: null })).toEqual({ mine: 'exact', both, inParty: false });
  });
});
