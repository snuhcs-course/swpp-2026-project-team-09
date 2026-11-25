/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { type UserDayService } from '../free-time/user-day.service.js';
import { type OtherFriend } from './answer-words.js';
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

// Each of the asker's Friends not in the plan with their day, read once for all the Plans, and their walk from the Place
// the Friend view puts them in.
export async function otherFriendsOf(
  friends: readonly FriendView[],
  date: string,
  { days, travel }: { days: Pick<UserDayService, 'itemsOn'>; travel: GatheringTravel },
): Promise<OtherFriend[]> {
  const items = await inTurns(friends, ({ id }) => days.itemsOn(id, date));
  return friends.map((friend, index) => {
    const from = locationPlaceOf(friend);
    return {
      userId: friend.id,
      name: friend.name,
      items: items[index] ?? [],
      walkTo: (placeId) => (from === null ? null : walkingMinutes(from, placeId, travel)),
    };
  });
}
