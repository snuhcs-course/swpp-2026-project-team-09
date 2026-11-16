/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { type TutorialPlace } from '../../tutorial/tutorial-content.js';
import { TutorialService } from '../../tutorial/tutorial.service.js';
import { UsersService } from '../../users/users.service.js';
import { type LocationMissing } from '../dto/answer.dto.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { questWay, type QuestWayAnswer } from './quest-way.js';
import { locate, spansOn, tutorialAnswer, type TutorialAnswer } from './tutorial-lookup.js';
import { STOP_MINUTES } from './tutorial-order.js';
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

  // The quests done at a place, which a way to a quest names.
  placedQuests(): { key: string; title: string }[] {
    return this.tutorial.placedQuests();
  }

  // The way to a quest's first place, a stop there, and on to the User's next item (board q12).
  async wayTo(
    userId: string,
    ask: { questKey: string; fromPlaceId: string | null },
    at: { now: Date; location: Position | null; locationMissing: LocationMissing },
  ): Promise<QuestWayAnswer | { result: 'none'; reason: 'no-quest' | 'online' | 'unmapped' }> {
    const { quests } = await this.tutorial.peek(userId);
    const quest = quests.find(({ key }) => key === ask.questKey);
    if (quest === undefined) {
      return { result: 'none', reason: 'no-quest' };
    }
    if (quest.places.length === 0) {
      return { result: 'none', reason: 'online' };
    }
    const visit = this.tutorial.visits().get(quest.key) ?? null;
    const where = locate(
      { key: quest.key, title: quest.title, places: quest.places, visit },
      { placeIdOf: (place) => this.placeIdOf(place), placeOf: (placeId) => this.ways.placeOf(placeId) },
    );
    if (where === null) {
      return { result: 'none', reason: 'unmapped' };
    }
    const args = await this.ways.argsFor(
      userId,
      { fromPlaceId: ask.fromPlaceId, toPlaceId: where.placeId, by: null },
      at,
    );
    return questWay(args, {
      title: quest.title,
      placeId: where.placeId,
      words: where.words,
      at: where.at,
      stayMinutes: STOP_MINUTES,
      open: spansOn(visit, koreaDate(at.now)),
      note: visit?.note ?? null,
    });
  }

  private placeIdOf(place: TutorialPlace): string | null {
    return 'place' in place ? (this.places.numbered(place.place)?.id ?? null) : this.ways.placeIdAt(place.point);
  }
}
