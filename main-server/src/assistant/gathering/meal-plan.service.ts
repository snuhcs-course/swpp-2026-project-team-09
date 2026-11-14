/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { type FriendDto } from '../../friends/dto/friends.dto.js';
import { FriendsService } from '../../friends/friends.service.js';
import { LocationSharingService } from '../../location-sharing/location-sharing.service.js';
import { MenusService } from '../../menus/menus.service.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UsersService } from '../../users/users.service.js';
import { type AnswerReply, type PlanInput } from '../dto/answer.dto.js';
import { freeTimeOf } from '../free-time/free-time.js';
import { openRestaurants } from '../free-time/meal-tools.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { gather, type GatheringPerson, MINUTE_MS } from './gathering.js';
import { type AnswerPerson, mealAnswer, type MealAnswerArgs } from './meal-answer.js';
import { conditionsOf, windowOf } from './plan-conditions.js';

// The one place that gathers what a meal's plan needs: the tool, the recalculation, and the making of a Quest call it,
// so that the three agree.
const menusOf = (collected: number, open: number, there: number): MealAnswerArgs['menus'] => {
  if (collected === 0) {
    return 'none';
  }
  if (open === 0) {
    return 'closed';
  }
  return there === 0 ? 'closed-at-place' : 'open';
};

@Injectable()
export class MealPlanService {
  constructor(
    private readonly days: UserDayService,
    private readonly friends: FriendsService,
    private readonly users: UsersService,
    private readonly menus: MenusService,
    private readonly restaurantPlaces: RestaurantPlaces,
    private readonly places: PlaceLookup,
    private readonly locations: LocationSharingService,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  async plan(askerId: string, input: PlanInput, at: { now: Date; location: Position | null }): Promise<AnswerReply> {
    const friends = await this.friendsOf(askerId, input);
    this.refuseUnknownPlaces(input);
    const now = new Date(Math.ceil(at.now.getTime() / MINUTE_MS) * MINUTE_MS);
    const { date, meal } = input;
    const [people, collected] = await Promise.all([
      this.peopleOf(askerId, friends, date, at.location),
      this.menus.findByDate(date),
    ]);
    const [askerPerson, ...friendPeople] = people.map(({ userId, items, position }, index): GatheringPerson => ({
      id: userId,
      free: freeTimeOf(items, date, now),
      locationPlaceId: this.placeIdAt(position),
      ...conditionsOf(input.people[index]?.constraints ?? [], date),
    }));
    if (askerPerson === undefined) {
      throw new Error('A plan has its asker');
    }
    const open = openRestaurants(collected, meal, this.restaurantPlaces).map(({ key, place }) => ({
      key,
      placeId: place.id,
    }));
    const candidates = input.placeId === null ? open : open.filter(({ placeId }) => placeId === input.placeId);
    const when = { window: windowOf(input), now };
    const gathering = gather([askerPerson, ...friendPeople], candidates, when, this.travel);
    const aloneMinutes =
      friendPeople.length === 0
        ? null
        : (gather([askerPerson], candidates, when, this.travel).fits[0]?.togetherMinutes ?? null);
    return mealAnswer({
      input,
      now,
      people,
      gathering,
      aloneMinutes,
      menus: menusOf(collected.length, open.length, candidates.length),
      placeOf: (placeId) => this.placeOf(placeId),
    });
  }

  // The Friends of the plan, in its order, refusing a plan that does not start with the asker, names anyone else or
  // anyone twice, or holds a constraint the asker did not set.
  private async friendsOf(askerId: string, input: PlanInput): Promise<FriendDto[]> {
    const [first, ...others] = input.people;
    if (first?.userId !== askerId) {
      throw new BadRequestException('The first person of a plan is the asker');
    }
    if (new Set(input.people.map(({ userId }) => userId)).size < input.people.length) {
      throw new BadRequestException('A person is in a plan once');
    }
    if (input.people.some(({ constraints }) => constraints.some(({ source }) => source !== 'asker'))) {
      throw new BadRequestException('Only the asker sets constraints');
    }
    const listed = await this.friends.listFriends(askerId);
    return others.map(({ userId }) => {
      const friend = listed.find(({ id }) => id === userId);
      if (friend === undefined) {
        throw new BadRequestException("Only the asker's Friends can be in a plan");
      }
      return friend;
    });
  }

  private refuseUnknownPlaces({ placeId, people }: PlanInput): void {
    const placeIds = people.flatMap(({ constraints }) =>
      constraints.flatMap((constraint) => (constraint.kind === 'from' ? [constraint.placeId] : [])),
    );
    if ([...placeIds, ...(placeId === null ? [] : [placeId])].some((id) => this.places.byId(id) === null)) {
      throw new BadRequestException('No such Place');
    }
  }

  private async peopleOf(
    askerId: string,
    friends: readonly FriendDto[],
    date: string,
    location: Position | null,
  ): Promise<[AnswerPerson, ...AnswerPerson[]]> {
    const [asker, positions, mine, ...theirs] = await Promise.all([
      this.users.findById(askerId),
      this.friendPositions(askerId),
      this.days.itemsOn(askerId, date),
      ...friends.map(({ id }) => this.days.itemsOn(id, date)),
    ]);
    return [
      { userId: askerId, name: asker.name, me: true, items: mine, position: location },
      ...friends.map(({ id, name }, index) => ({
        userId: id,
        name,
        me: false,
        items: theirs[index] ?? [],
        position: positions.get(id) ?? null,
      })),
    ];
  }

  // The only place the Assistant reads a Friend's position: what the asker's map shows of them.
  private async friendPositions(askerId: string): Promise<Map<string, Position>> {
    const positions = await this.locations.visiblePositions(askerId);
    return new Map(positions.map(({ userId, latitude, longitude }) => [userId, { latitude, longitude }]));
  }

  private placeIdAt(position: Position | null): string | null {
    return position === null ? null : (this.places.at(position)?.place.id ?? null);
  }

  private placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}
