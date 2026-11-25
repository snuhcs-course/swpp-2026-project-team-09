/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { type DayItem, type FreeInterval, freeTimeOf } from '../free-time/free-time.js';
import { type Interval } from '../free-time/meal-fit.js';
import { type UserDayService } from '../free-time/user-day.service.js';
import { type OtherFriend } from './answer-words.js';
import { originOf } from './gathering.js';
import { type GatheringTravel, walkingMinutes } from './gathering-travel.js';

// The Place the Friend view puts a Friend in now: the one of their position at 'exact', and all there is at 'building'.
export const locationPlaceOf = (friend: FriendView | undefined): string | null =>
  friend === undefined || friend.level === 'timetable' ? null : friend.placeId;

// How many Friends' days are read at once: each takes two queries, and a long list of Friends waits in turns rather
// than holding the database's connections all together.
const DAYS_AT_ONCE = 8;

function inTurns<T, R>(items: readonly T[], each: (item: T) => Promise<R>): Promise<R[]> {
  const turns = Array.from({ length: Math.ceil(items.length / DAYS_AT_ONCE) }, (_, at) =>
    items.slice(at * DAYS_AT_ONCE, (at + 1) * DAYS_AT_ONCE),
  );
  return turns.reduce<Promise<R[]>>(
    async (done, turn) => [...(await done), ...(await Promise.all(turn.map((item) => each(item))))],
    Promise.resolve([]),
  );
}

// Each of the asker's Friends not in the plan with their day, read once for all the Plans, and the Place the Friend
// view puts them in.
export async function otherFriendsOf(
  friends: readonly FriendView[],
  date: string,
  { days, travel }: { days: Pick<UserDayService, 'itemsOn'>; travel: GatheringTravel },
): Promise<OtherFriend[]> {
  const items = await inTurns(friends, ({ id }) => days.itemsOn(id, date));
  return friends.map((friend, index) => ({
    userId: friend.id,
    name: friend.name,
    items: items[index] ?? [],
    locationPlaceId: locationPlaceOf(friend),
    walk: (from, to) => walkOrNone(from, to, travel),
  }));
}

// The stretch of an other Friend's Free Time a Plan's span is weighed in: the one that holds it, as for a picked person
// (`aroundShared`), else, for a Friend busy at its start, the one they come free in.
function stretchFor(free: readonly FreeInterval[], { start, end }: Interval): Pick<FreeInterval, 'start' | 'previous'> {
  return (
    free.find((stretch) => stretch.start <= start && end <= stretch.end) ??
    free.find((stretch) => stretch.start > start) ?? { start, previous: null }
  );
}

export interface SetOut {
  // The minutes from where they set out to the Plan's Place, null when that is not known.
  walkMinutes: number | null;
  // The item of their day they set out after, when it is its Place they set out from.
  after: DayItem | null;
}

// Where an other Friend sets out from for a Plan at `placeId` over `span` (P04 ticket 68), by the planner's own rule for
// a picked person (`originOf`): the Place of the item before the stretch while it keeps them until then, else the Place
// the Friend view puts them in, else that of an item that has just ended.
export function setOutOf(other: OtherFriend, span: Interval, at: { date: string; now: Date; placeId: string }): SetOut {
  const stretch = stretchFor(freeTimeOf(other.items, at.date, at.now), span);
  const origin = originOf({ locationPlaceId: other.locationPlaceId }, stretch, at.now);
  return {
    walkMinutes: origin === null ? null : other.walk(origin.placeId, at.placeId),
    after: origin?.basis === 'timetable' ? stretch.previous : null,
  };
}

// The walking table throws for a Place it has no row for, as one an Administrator adds before the table is rebuilt.
// Here that leaves this Friend's walk unknown rather than fail the answer for every Friend (as `LocationSharingService`
// does for positions).
function walkOrNone(from: string, to: string, travel: GatheringTravel): number | null {
  try {
    return walkingMinutes(from, to, travel);
  } catch {
    return null;
  }
}
