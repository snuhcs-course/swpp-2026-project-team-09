/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { latest } from '../free-time/meal-fit.js';
import { type GatheringFit, type GatheringSide, type PersonPart } from './gathering.js';
import { type GatheringTravel, walkingMinutes as minutes } from './gathering-travel.js';

// The Merging Point of a meal: the asker's origin, where Friends whose way passes it meet the asker and walk on
// together.

// The most a Friend's way may grow by going through the asker's origin to meet there.
export const DETOUR_MINUTES = 1;

export type Meeting = NonNullable<GatheringFit['meeting']>;

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * 60 * 1000);

// Friends whose way passes the asker's origin meet the asker there; never two Friends without the asker.
function meetingOf(
  placeId: string,
  asker: GatheringSide,
  friends: readonly GatheringSide[],
  travel: GatheringTravel,
): Meeting | null {
  const meetAt = asker.origin?.placeId;
  if (meetAt === undefined || meetAt === placeId) {
    return null;
  }
  const onwardMinutes = minutes(meetAt, placeId, travel);
  const merging = friends.filter(({ origin }) => {
    if (origin === null || origin.placeId === placeId) {
      return false;
    }
    const detour = minutes(origin.placeId, meetAt, travel) + onwardMinutes - minutes(origin.placeId, placeId, travel);
    return detour <= DETOUR_MINUTES;
  });
  if (merging.length === 0) {
    return null;
  }
  const at = latest([
    asker.readyAt,
    ...merging.map(({ readyAt, origin }) => plusMinutes(readyAt, minutes(origin?.placeId ?? meetAt, meetAt, travel))),
  ]);
  const personIds = [asker.personId, ...merging.map(({ personId }) => personId)];
  return { placeId: meetAt, at, personIds, onwardMinutes };
}

// A person's way to the place, through a meeting or on their own (null).
type WayOf = (side: GatheringSide, meeting: Meeting | null) => Pick<PersonPart, 'by' | 'canArriveAt'>;

// The meeting on the way, which is on foot, kept only for those it gets there no later than their own leg by the
// shuttle: a Friend whose own shuttle is sooner goes their own way, and an asker whose own shuttle is sooner meets
// nobody. A merge on foot is weighed as before. Riding one shuttle together is not planned.
export function meetingOnTheWay(
  placeId: string,
  [asker, ...friends]: readonly [GatheringSide, ...GatheringSide[]],
  travel: GatheringTravel,
  wayOf: WayOf,
): Meeting | null {
  const meeting = meetingOf(placeId, asker, friends, travel);
  if (meeting === null) {
    return null;
  }
  const sooner = (side: GatheringSide): boolean => {
    const own = wayOf(side, null);
    const merged = wayOf(side, meeting).canArriveAt;
    return own.by === 'shuttle' && own.canArriveAt !== null && merged !== null && own.canArriveAt < merged;
  };
  if (sooner(asker)) {
    return null;
  }
  const staying = friends.filter(({ personId }) => meeting.personIds.includes(personId));
  const kept = staying.filter((friend) => !sooner(friend));
  return kept.length === staying.length ? meeting : meetingOf(placeId, asker, kept, travel);
}
