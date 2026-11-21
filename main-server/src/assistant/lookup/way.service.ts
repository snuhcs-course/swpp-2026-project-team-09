/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { CampusBoundary } from '../../common/campus-boundary.js';
import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { ShuttleService } from '../../shuttle/shuttle.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UsersService } from '../../users/users.service.js';
import { type LocationMissing } from '../dto/answer.dto.js';
import { type DayItem, onDay } from '../free-time/free-time.js';
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
    ask: { fromPlaceId: string | null; toPlaceId: string | null; by: string | null; about?: 'shuttle'; date?: string },
    at: { now: Date; location: Position | null; locationMissing: LocationMissing },
  ): Promise<WayAnswer> {
    const args = await this.argsFor(userId, ask, at);
    const { date } = ask;
    if (date === undefined || date === koreaDate(at.now)) {
      return wayAnswer(args);
    }
    return wayAnswer(onAnotherDay(args, date, await this.days.itemsOn(userId, date)));
  }

  async argsFor(
    userId: string,
    ask: { fromPlaceId: string | null; toPlaceId: string | null; by: string | null },
    at: { now: Date; location: Position | null; locationMissing?: LocationMissing },
  ): Promise<WayArgs> {
    const { now, location, locationMissing = null } = at;
    const [user, items, { stops }, vehicles] = await Promise.all([
      this.users.findById(userId),
      this.days.itemsOn(userId, koreaDate(now)),
      this.shuttle.route(),
      this.shuttle.reportedVehicles(),
    ]);
    return {
      now,
      me: { userId, name: user.name, items },
      location: this.located(location),
      locationMissing,
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

  // Where the app says the User is, with the Place it is in or the nearest within 150 m, and whether it is on campus.
  located(location: Position | null): WayArgs['location'] {
    return location === null
      ? null
      : { at: location, placeId: this.placeIdAt(location), onCampus: this.campus.contains(location) };
  }

  gatePlaceId(): string {
    const placeId = this.places.placeIdOf({ placeId: null, label: MAIN_GATE, latitude: null, longitude: null });
    if (placeId === null) {
      throw new Error(`No Place ${MAIN_GATE}`);
    }
    return placeId;
  }

  // The Place the position is in, or the nearest within 150 m.
  placeIdAt(position: Position): string | null {
    return (this.places.at(position)?.place ?? this.places.nearTo(position))?.id ?? null;
  }

  placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}

// The day of an item on another day starts then when nothing comes before it.
const DAY_STARTS_AT = '08:00';

// The first item of the day at the Place, or the first with a Place.
function targetOf(items: readonly DayItem[], toPlaceId: string | null): DayItem | undefined {
  return items.find(({ placeId }) => (toPlaceId === null ? placeId !== null : placeId === toPlaceId));
}

// A way to an item on another day, as it will be that day: from the item that ends before it, at its end, never from
// where the phone is now. With no item before it, the start is unknown unless the User named one.
export function onAnotherDay(args: WayArgs, date: string, items: DayItem[]): WayArgs {
  const sorted = items.toSorted((one, other) => one.start.getTime() - other.start.getTime());
  const deadline = args.by === null ? (targetOf(sorted, args.toPlaceId)?.start ?? null) : onDay(date, args.by);
  const before = sorted
    .filter(({ end }) => deadline === null || end <= deadline)
    .toSorted((one, other) => one.end.getTime() - other.end.getTime())
    .at(-1);
  const now = before?.end ?? onDay(date, DAY_STARTS_AT);
  return { ...args, now, me: { ...args.me, items: sorted }, location: null, locationMissing: null };
}
