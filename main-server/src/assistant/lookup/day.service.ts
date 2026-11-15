/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { dayAnswer, type DayAnswer } from './day-lookup.js';

// What a day's Classes drawn on the map need that the server reads itself: the User's day and the Places.
@Injectable()
export class DayLookupService {
  constructor(
    private readonly days: UserDayService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  async find(userId: string, date: string, now: Date): Promise<DayAnswer> {
    const items = await this.days.itemsOn(userId, date);
    return dayAnswer({
      date,
      now,
      me: { userId, items },
      travel: this.travel,
      placeOf: (placeId) => this.placeOf(placeId),
    });
  }

  private placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}
