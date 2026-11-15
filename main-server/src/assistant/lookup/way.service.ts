/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { CampusBoundary } from '../../common/campus-boundary.js';
import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { ShuttleService } from '../../shuttle/shuttle.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UsersService } from '../../users/users.service.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { wayAnswer, type WayAnswer, type WayArgs } from './way-lookup.js';

// The Place a way from off campus starts at.
const MAIN_GATE = '서울대 정문';

// What a way needs that the server reads itself: the User's name and day, the Place of their location and whether it
// is on campus, the main gate, and the shuttle's stops and the shuttles reported now.
@Injectable()
export class WayService {
  constructor(
    private readonly days: UserDayService,
    private readonly users: UsersService,
    private readonly places: PlaceLookup,
    private readonly campus: CampusBoundary,
    private readonly shuttle: ShuttleService,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  async find(
    userId: string,
    ask: { fromPlaceId: string | null; toPlaceId: string | null; by: string | null },
    at: { now: Date; location: Position | null },
  ): Promise<WayAnswer> {
    return wayAnswer(await this.argsFor(userId, ask, at));
  }

  async argsFor(
    userId: string,
    ask: { fromPlaceId: string | null; toPlaceId: string | null; by: string | null },
    at: { now: Date; location: Position | null },
  ): Promise<WayArgs> {
    const { now, location } = at;
    const [user, items, { stops }, vehicles] = await Promise.all([
      this.users.findById(userId),
      this.days.itemsOn(userId, koreaDate(now)),
      this.shuttle.route(),
      this.shuttle.reportedVehicles(),
    ]);
    return {
      now,
      me: { userId, name: user.name, items },
      location:
        location === null
          ? null
          : { at: location, placeId: this.placeIdAt(location), onCampus: this.campus.contains(location) },
      ...ask,
      gatePlaceId: this.gatePlaceId(),
      travel: this.travel,
      shuttle: {
        stops,
        reported: (vehicles ?? []).map(({ stop, receivedAt }) => ({ stop: stop.name, at: new Date(receivedAt) })),
      },
      placeOf: (placeId) => this.placeOf(placeId),
    };
  }

  private gatePlaceId(): string {
    const placeId = this.places.placeIdOf({ placeId: null, label: MAIN_GATE, latitude: null, longitude: null });
    if (placeId === null) {
      throw new Error(`No Place ${MAIN_GATE}`);
    }
    return placeId;
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
