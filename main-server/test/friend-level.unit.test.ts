/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FriendLevel } from '../src/generated/prisma/client.js';
import { levelSeen } from '../src/location-sharing/friend-level.js';

// What a viewer sees of where a subject is, from what lies between them.

const ON = { bothMasterSwitchesOn: true, commonParty: false };

// The viewer's end, the subject's end, and what the viewer sees: the lower of the two.
const PAIRS: [FriendLevel, FriendLevel, FriendLevel][] = [
  ['timetable', 'timetable', 'timetable'],
  ['timetable', 'building', 'timetable'],
  ['timetable', 'exact', 'timetable'],
  ['building', 'timetable', 'timetable'],
  ['building', 'building', 'building'],
  ['building', 'exact', 'building'],
  ['exact', 'timetable', 'timetable'],
  ['exact', 'building', 'building'],
  ['exact', 'exact', 'exact'],
];

describe('Two Friends with both Master Switches on', () => {
  it.each(PAIRS)('at %s and %s see each other at %s', (viewer, subject, seen) => {
    expect(levelSeen({ ...ON, friendship: [viewer, subject] })).toBe(seen);
    expect(levelSeen({ ...ON, friendship: [subject, viewer] })).toBe(seen);
  });
});

describe('Either Master Switch off', () => {
  it.each(PAIRS)('leaves Friends at %s and %s at the Timetable, in a common Party too', (viewer, subject) => {
    for (const commonParty of [false, true]) {
      expect(levelSeen({ bothMasterSwitchesOn: false, commonParty, friendship: [viewer, subject] })).toBe('timetable');
    }
  });
});

describe('A common Party whose switch both have on', () => {
  it.each(PAIRS)('lets Friends at %s and %s see each other exactly', (viewer, subject) => {
    expect(levelSeen({ ...ON, commonParty: true, friendship: [viewer, subject] })).toBe('exact');
  });

  it('lets two who are no Friends see each other exactly', () => {
    expect(levelSeen({ ...ON, commonParty: true, friendship: null })).toBe('exact');
  });
});

describe('Two who are neither Friends nor in a common Party', () => {
  it('see nothing of each other above the Timetable', () => {
    expect(levelSeen({ ...ON, friendship: null })).toBe('timetable');
  });
});
