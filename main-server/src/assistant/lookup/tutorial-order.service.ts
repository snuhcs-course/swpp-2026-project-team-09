/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { type TutorialPlace } from '../../tutorial/tutorial-content.js';
import { TutorialService } from '../../tutorial/tutorial.service.js';
import { UsersService } from '../../users/users.service.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { tutorialAnswer, type TutorialAnswer } from './tutorial-lookup.js';
import { WayService } from './way.service.js';

// What the Tutorial Quests in order need that the server reads itself: the quests the User has not completed and when
// each can be done, the User's day, and where they are, read as a way reads it.
@Injectable()
export class TutorialOrderService {
  constructor(
    private readonly tutorial: TutorialService,
    private readonly days: UserDayService,
    private readonly users: UsersService,
    private readonly places: PlaceLookup,
    private readonly ways: WayService,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  async orderFor(
    userId: string,
    ask: { fromPlaceId: string | null },
    at: { now: Date; location: Position | null },
  ): Promise<TutorialAnswer> {
    const { now, location } = at;
    const [user, items, { quests }] = await Promise.all([
      this.users.findById(userId),
      this.days.itemsOn(userId, koreaDate(now)),
      this.tutorial.peek(userId),
    ]);
    const visits = this.tutorial.visits();
    return tutorialAnswer({
      now,
      me: { userId, name: user.name, items },
      location: this.ways.located(location),
      fromPlaceId: ask.fromPlaceId,
      gatePlaceId: this.ways.gatePlaceId(),
      quests: quests
        .filter(({ status }) => status !== 'completed')
        .map(({ key, title, places }) => ({ key, title, places, visit: visits.get(key) ?? null })),
      placeIdOf: (place) => this.placeIdOf(place),
      travel: this.travel,
      placeOf: (placeId) => this.ways.placeOf(placeId),
    });
  }

  private placeIdOf(place: TutorialPlace): string | null {
    return 'place' in place ? (this.places.numbered(place.place)?.id ?? null) : this.ways.placeIdAt(place.point);
  }
}
