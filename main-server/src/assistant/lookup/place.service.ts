/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { type PublishedGlobalEventDto } from '../../global-events/dto/global-event.dto.js';
import { GlobalEventsService } from '../../global-events/global-events.service.js';
import { MenusService } from '../../menus/menus.service.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { type Lookup } from '../dto/answer.dto.js';
import { dateOf, endOfDay, startOfDay } from '../free-time/free-time.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { shownLevel } from './friend-lookup.js';
import { mealAt, placeAnswer, type PlaceArgs, type PlaceEvent } from './place-lookup.js';
import { WayService } from './way.service.js';

// What a pressed building's card reads: the User's way and day, the menus of the meal now, the day's published events,
// and the Friends through the Friend view with their Classes, never their Quests.
@Injectable()
export class PlaceCardService {
  constructor(
    private readonly ways: WayService,
    private readonly places: PlaceLookup,
    private readonly menus: MenusService,
    private readonly globalEvents: GlobalEventsService,
    private readonly friendViews: FriendViewService,
    private readonly days: UserDayService,
  ) {}

  // Null for an id that is no Place.
  async find(userId: string, placeId: string, at: { now: Date; location: Position | null }): Promise<Lookup | null> {
    if (this.places.byId(placeId) === null) {
      return null;
    }
    const { now } = at;
    const date = koreaDate(now);
    const meal = mealAt(now);
    const [way, menus, events, friends] = await Promise.all([
      this.ways.argsFor(userId, { fromPlaceId: null, toPlaceId: placeId, by: null }, at),
      meal === null ? [] : this.menus.findByDate(date),
      this.globalEvents.searchPublished({ period: { from: startOfDay(date), to: endOfDay(date) } }, now),
      this.friendsAt(userId, placeId, date),
    ]);
    const restaurants = menus
      .filter((menu) => menu.placeId === placeId)
      .map(({ name, meals }) => ({ name, lines: meals.find((served) => served.meal === meal)?.lines ?? [] }));
    return placeAnswer({
      placeId,
      way,
      meal: meal === null ? null : { meal, restaurants },
      events: events.flatMap((event) => this.eventAt(event, placeId) ?? []),
      friends,
    });
  }

  // Every Friend the map may show in the Place: none it draws in another building.
  private async friendsAt(userId: string, placeId: string, date: string): Promise<PlaceArgs['friends']> {
    const views = (await this.friendViews.list(userId)).filter(
      (friend) => shownLevel(friend) === 'timetable' || friend.placeId === placeId,
    );
    return Promise.all(
      views.map(async (friend) => ({
        friend,
        classes: (await this.days.itemsOn(friend.id, date)).filter(({ isClass }) => isClass),
      })),
    );
  }

  // A published event has a start; the search leaves out any without one.
  private eventAt(
    { id, title, startsAt, endsAt, place, latitude, longitude }: PublishedGlobalEventDto,
    placeId: string,
  ): PlaceEvent | null {
    const start = dateOf(startsAt);
    const at = this.places.placeIdOf({ placeId: null, label: place ?? '', latitude, longitude });
    return start === null || at !== placeId ? null : { id, title, start, end: dateOf(endsAt) };
  }
}
