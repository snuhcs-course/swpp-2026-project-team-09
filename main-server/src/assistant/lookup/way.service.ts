/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UsersService } from '../../users/users.service.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { wayAnswer, type WayAnswer } from './way-lookup.js';

// What a way needs that the server reads itself: the User's name and day, and the Place of their location.
@Injectable()
export class WayService {
  constructor(
    private readonly days: UserDayService,
    private readonly users: UsersService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  async find(
    userId: string,
    ask: { fromPlaceId: string | null; toPlaceId: string },
    at: { now: Date; location: Position | null },
  ): Promise<WayAnswer> {
    const { now, location } = at;
    const [user, items] = await Promise.all([this.users.findById(userId), this.days.itemsOn(userId, koreaDate(now))]);
    return wayAnswer({
      now,
      me: { userId, name: user.name, items },
      location: location === null ? null : { at: location, placeId: this.placeIdAt(location) },
      ...ask,
      travel: this.travel,
      placeOf: (placeId) => this.placeOf(placeId),
    });
  }

  // The Place the position is in, or the nearest within 150 m.
  private placeIdAt(position: Position): string | null {
    return (this.places.at(position)?.place ?? this.places.nearTo(position))?.id ?? null;
  }

  private placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}
