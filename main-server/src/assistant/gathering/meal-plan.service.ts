/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { MenusService } from '../../menus/menus.service.js';
import { RestaurantHours } from '../../menus/restaurant-hours.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { TimetableService } from '../../timetable/timetable.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UsersService } from '../../users/users.service.js';
import { type AnswerReply, type LocationMissing, type MealInput } from '../dto/answer.dto.js';
import { freeTimeOf } from '../free-time/free-time.js';
import { openRestaurants } from '../free-time/meal-tools.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { type GatheringPerson, MINUTE_MS } from './gathering.js';
import { type AnswerPerson, mealAnswer, type MealAnswerArgs } from './meal-answer.js';
import { type MissingInputs } from './missing-inputs.js';
import { conditionsOf } from './plan-conditions.js';
import { gatherMeal, withHours } from './unmet-plans.js';

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

// The Place the Friend view puts a Friend in now: the one of their position at 'exact', and all there is at 'building'.
export const locationPlaceOf = (friend: FriendView | undefined): string | null =>
  friend === undefined || friend.level === 'timetable' ? null : friend.placeId;

@Injectable()
export class MealPlanService {
  constructor(
    private readonly days: UserDayService,
    private readonly friends: FriendViewService,
    private readonly users: UsersService,
    private readonly menus: MenusService,
    private readonly restaurantPlaces: RestaurantPlaces,
    private readonly places: PlaceLookup,
    private readonly timetable: TimetableService,
    private readonly hours: RestaurantHours,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  // `leftOut` names Sub Quests that stand in nobody's way: a Quest being planned again leaves its own out.
  // `locationMissing` says why the app sent no location.
  async plan(
    askerId: string,
    input: MealInput,
    at: { now: Date; location: Position | null; locationMissing?: LocationMissing; leftOut?: readonly string[] },
  ): Promise<AnswerReply> {
    const friends = await this.friendsOf(askerId, input);
    this.refuseUnknownPlaces(input);
    const now = new Date(Math.ceil(at.now.getTime() / MINUTE_MS) * MINUTE_MS);
    const { date, meal } = input;
    const [people, collected, missing] = await Promise.all([
      this.peopleOf(askerId, friends, date, at.location),
      this.menus.findByDate(date),
      this.missingOf(askerId, at),
    ]);
    const leftOut = new Set(at.leftOut);
    for (const person of people) {
      person.items = person.items.filter(({ id }) => !leftOut.has(id));
    }
    const [askerPerson, ...friendPeople] = people.map(({ userId, items, position }, index): GatheringPerson => ({
      id: userId,
      free: freeTimeOf(items, date, now),
      locationPlaceId: index === 0 ? this.placeIdAt(position) : locationPlaceOf(friends[index - 1]),
      locationMissing: index === 0 && missing.locationMissing !== null,
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
    const hours = await Promise.all(candidates.map(({ key }) => this.hours.hoursOf(key, meal, date)));
    const { places, window } = withHours(input, candidates, hours);
    const gathered = gatherMeal([askerPerson, ...friendPeople], places, { input, now, window }, this.travel);
    return mealAnswer({
      input,
      now,
      people,
      ...gathered,
      menus: menusOf(collected.length, open.length, candidates.length),
      placeOf: (placeId) => this.placeOf(placeId),
      missing,
    });
  }

  // Why the app sent no location, and whether the asker has no Class at all.
  private async missingOf(
    askerId: string,
    { location, locationMissing = null }: { location: Position | null; locationMissing?: LocationMissing },
  ): Promise<MissingInputs> {
    const classes = await this.timetable.classesOf(askerId);
    return { locationMissing: location === null ? locationMissing : null, noClasses: classes.length === 0 };
  }

  // The Friends of the plan, in its order, refusing a plan that does not start with the asker, names anyone else or
  // anyone twice, or holds a constraint the asker did not set. A meet's people are read the same way.
  async friendsOf(askerId: string, input: Pick<MealInput, 'people'>): Promise<FriendView[]> {
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
    const listed = await this.friends.list(askerId);
    return others.map(({ userId }) => {
      const friend = listed.find(({ id }) => id === userId);
      if (friend === undefined) {
        throw new BadRequestException("Only the asker's Friends can be in a plan");
      }
      return friend;
    });
  }

  refuseUnknownPlaces({ placeId, people }: Pick<MealInput, 'placeId' | 'people'>): void {
    const placeIds = people.flatMap(({ constraints }) =>
      constraints.flatMap((constraint) => (constraint.kind === 'from' ? [constraint.placeId] : [])),
    );
    if ([...placeIds, ...(placeId === null ? [] : [placeId])].some((id) => this.places.byId(id) === null)) {
      throw new BadRequestException('No such Place');
    }
  }

  async peopleOf(
    askerId: string,
    friends: readonly FriendView[],
    date: string,
    location: Position | null,
  ): Promise<[AnswerPerson, ...AnswerPerson[]]> {
    const [asker, mine, ...theirs] = await Promise.all([
      this.users.findById(askerId),
      this.days.itemsOn(askerId, date),
      ...friends.map(({ id }) => this.days.itemsOn(id, date)),
    ]);
    return [
      { userId: askerId, name: asker.name, me: true, items: mine, position: location },
      ...friends.map(({ id, name, level, position }, index) => ({
        userId: id,
        name,
        me: false,
        items: theirs[index] ?? [],
        level,
        // The only place the Assistant uses a Friend's position: what the Friend view lets the asker see.
        position:
          level === 'exact' && position !== null
            ? { latitude: position.latitude, longitude: position.longitude }
            : null,
      })),
    ];
  }

  placeIdAt(position: Position | null): string | null {
    return position === null ? null : (this.places.at(position)?.place.id ?? null);
  }

  placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}
