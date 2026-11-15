/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { shownMinutes, TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { type Lookup } from '../dto/answer.dto.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { friendAnswer, type FriendAnswer, type FriendArgs, friendTap, type FriendTapArgs } from './friend-lookup.js';
import { startOf } from './way.js';
import { WayNaming } from './way-naming.js';
import { WayService } from './way.service.js';

export interface FriendSources {
  friends: Pick<FriendViewService, 'list'>;
  days: Pick<UserDayService, 'itemsOn'>;
  places: Pick<PlaceLookup, 'byId' | 'nearTo'>;
}

// What the asker's map shows of a Friend now, read only through the Friend view and the Friend's Classes of the day,
// never their Quests; null for a User who is not the asker's Friend.
async function friendRead(
  { friends, days, places }: FriendSources,
  askerId: string,
  friendId: string,
  now: Date,
): Promise<FriendArgs | null> {
  const friend = (await friends.list(askerId)).find(({ id }) => id === friendId);
  if (friend === undefined) {
    return null;
  }
  const items = await days.itemsOn(friendId, koreaDate(now));
  const position = friend.level === 'exact' ? friend.position : null;
  return {
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
  };
}

export async function friendLookup(
  sources: FriendSources,
  askerId: string,
  friendId: string,
  now: Date,
): Promise<FriendAnswer | null> {
  const args = await friendRead(sources, askerId, friendId, now);
  return args === null ? null : friendAnswer(args);
}

// A pressed Friend's face, with the walk to them from where the asker sets out.
export async function friendTapLookup(
  sources: FriendSources,
  askerId: string,
  friendId: string,
  now: Date,
  from: Pick<FriendTapArgs, 'start' | 'walkMinutes'>,
): Promise<Lookup | null> {
  const args = await friendRead(sources, askerId, friendId, now);
  return args === null ? null : friendTap({ ...args, ...from });
}

@Injectable()
export class FriendLookupService implements FriendSources {
  constructor(
    readonly friends: FriendViewService,
    readonly days: UserDayService,
    readonly places: PlaceLookup,
    private readonly ways: WayService,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  find(askerId: string, friendId: string, now: Date): Promise<FriendAnswer | null> {
    return friendLookup(this, askerId, friendId, now);
  }

  // The asker sets out as a way of theirs does.
  async tap(askerId: string, friendId: string, at: { now: Date; location: Position | null }): Promise<Lookup | null> {
    const args = await this.ways.argsFor(askerId, { fromPlaceId: null, toPlaceId: null, by: null }, at);
    const start = startOf(args);
    return friendTapLookup(this, askerId, friendId, at.now, {
      start: start === null ? null : { placeId: start.placeId, label: new WayNaming(args).from({ start }) },
      walkMinutes: (from, to) => shownMinutes(this.travel.walkingSeconds(from, to)),
    });
  }
}
