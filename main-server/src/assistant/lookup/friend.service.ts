/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { friendAnswer, type FriendAnswer } from './friend-lookup.js';

export interface FriendSources {
  friends: Pick<FriendViewService, 'list'>;
  days: Pick<UserDayService, 'itemsOn'>;
  places: Pick<PlaceLookup, 'byId' | 'nearTo'>;
}

// What the asker's map shows of a Friend now, read only through the Friend view and the Friend's Classes of the day,
// never their Quests; null for a User who is not the asker's Friend.
export async function friendLookup(
  { friends, days, places }: FriendSources,
  askerId: string,
  friendId: string,
  now: Date,
): Promise<FriendAnswer | null> {
  const friend = (await friends.list(askerId)).find(({ id }) => id === friendId);
  if (friend === undefined) {
    return null;
  }
  const items = await days.itemsOn(friendId, koreaDate(now));
  const position = friend.level === 'exact' ? friend.position : null;
  return friendAnswer({
    now,
    friend,
    classes: items.filter(({ isClass }) => isClass),
    nearPlaceId: position === null || friend.placeId !== null ? null : (places.nearTo(position)?.id ?? null),
    placeOf: (placeId) => {
      const place = places.byId(placeId);
      if (place === null) {
        throw new Error(`No Place ${placeId}`);
      }
      return place;
    },
  });
}

@Injectable()
export class FriendLookupService implements FriendSources {
  constructor(
    readonly friends: FriendViewService,
    readonly days: UserDayService,
    readonly places: PlaceLookup,
  ) {}

  find(askerId: string, friendId: string, now: Date): Promise<FriendAnswer | null> {
    return friendLookup(this, askerId, friendId, now);
  }
}
