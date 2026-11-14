/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FriendLevel } from '../generated/prisma/client.js';

const FROM_LEAST: readonly FriendLevel[] = ['timetable', 'building', 'exact'];

// What lies between a viewer and a subject.
export interface Between {
  bothMasterSwitchesOn: boolean;
  // Both are members of one Party, each with its switch on.
  commonParty: boolean;
  // The level at each end of their friendship, or null when they are not Friends.
  friendship: readonly [FriendLevel, FriendLevel] | null;
}

// What a viewer sees of where a subject is, the same from either side: nothing above the Timetable while either Master
// Switch is off, the position in a common Party, and otherwise the lower of the two ends of their friendship. Two who
// share neither see nothing of each other's location, which reads as the Timetable.
export function levelSeen({ bothMasterSwitchesOn, commonParty, friendship }: Between): FriendLevel {
  if (!bothMasterSwitchesOn) {
    return 'timetable';
  }
  if (commonParty) {
    return 'exact';
  }
  if (friendship === null) {
    return 'timetable';
  }
  const [one, other] = friendship;
  return FROM_LEAST.indexOf(one) < FROM_LEAST.indexOf(other) ? one : other;
}
