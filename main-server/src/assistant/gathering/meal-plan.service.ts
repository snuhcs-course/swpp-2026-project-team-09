/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { PrismaService } from '../../common/prisma.service.js';
import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { type Cuisines } from '../../menus/cuisine-words.js';
import { type RestaurantMenusDto } from '../../menus/dto/restaurant-menus.dto.js';
import { MenusService } from '../../menus/menus.service.js';
import { type Hours, RestaurantHours } from '../../menus/restaurant-hours.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { heldMealOf } from '../../quests/held-meal.js';
import { type KeptKind, type KeptQuest, keptQuestsOf } from '../../quests/kept-quests.js';
import { TimetableService } from '../../timetable/timetable.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UsersService } from '../../users/users.service.js';
import {
  type AnswerReply,
  type KeptQuestDto,
  type LocationMissing,
  type MealInput,
  type MeetInput,
} from '../dto/answer.dto.js';
import { clockOf, type DayItem, freeTimeOf, onDay } from '../free-time/free-time.js';
import { mealWindow } from '../free-time/meal-fit.js';
import { openRestaurants } from '../free-time/meal-tools.js';
import { type OpenRestaurant } from '../free-time/restaurant-card.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { keptDto } from '../lookup/day-quests.js';
import { type GatheringPerson, MINUTE_MS } from './gathering.js';
import { type AnswerPerson, mealAnswer, type MealAnswerArgs } from './meal-answer.js';
import { type ServedMenu } from './meal-menu.js';
import { type BusyItem, busyIn, leaveOut, mealSetOf } from './meal-plan-parts.js';
import { type MissingInputs } from './missing-inputs.js';
import { placeLabelOf } from './place-naming.js';
import { relatedOf } from './related-quests.js';
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

// Each candidate's menu for the meal, by its key, with when it closes.
function servedOf(
  restaurants: readonly OpenRestaurant[],
  candidates: readonly { key: string }[],
  { hours, cuisines }: { hours: readonly (Hours | null)[]; cuisines: Cuisines },
): Map<string, ServedMenu> {
  return new Map(
    candidates.map(({ key }, index): [string, ServedMenu] => [
      key,
      {
        lines: restaurants.find((each) => each.key === key)?.lines ?? [],
        closesAt: hours[index]?.closesAt ?? null,
        cuisines,
      },
    ]),
  );
}

interface PlanAt {
  now: Date;
  location: Position | null;
  locationMissing?: LocationMissing;
  leftOut?: readonly string[];
}

// The Place the Friend view puts a Friend in now: the one of their position at 'exact', and all there is at 'building'.
export const locationPlaceOf = (friend: FriendView | undefined): string | null =>
  friend === undefined || friend.level === 'timetable' ? null : friend.placeId;

@Injectable()
export class MealPlanService {
  constructor(
    private readonly prisma: PrismaService,
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
  async plan(askerId: string, input: MealInput, at: PlanAt): Promise<AnswerReply> {
    return (await this.planned(askerId, input, at)).answer;
  }

  // The answer, each candidate Restaurant's menu by its key, which the model reads in words, and, when no time is free
  // for the meal, the asker's items that fill it. The asker's own Quest for the same meal and day is set aside: the new
  // Plan would replace it.
  async planned(
    askerId: string,
    input: MealInput,
    at: PlanAt,
  ): Promise<{ answer: AnswerReply; served: ReadonlyMap<string, ServedMenu>; busy?: BusyItem[] }> {
    const friends = await this.friendsOf(askerId, input);
    this.refuseUnknownPlaces(input);
    const now = new Date(Math.ceil(at.now.getTime() / MINUTE_MS) * MINUTE_MS);
    const { date, meal } = input;
    const [people, collected, missing, held] = await Promise.all([
      this.peopleOf(askerId, friends, date, at.location),
      this.menus.findByDate(date),
      this.missingOf(askerId, at),
      heldMealOf(this.prisma, askerId, input),
    ]);
    leaveOut(people, [...(at.leftOut ?? []), ...(held?.subQuestIds ?? [])]);
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
    const restaurants = openRestaurants(collected, meal, this.restaurantPlaces);
    const open = restaurants.map(({ key, place }) => ({ key, placeId: place.id }));
    const candidates = input.placeId === null ? open : open.filter(({ placeId }) => placeId === input.placeId);
    const { hours, menus } = await this.servedMenus(restaurants, candidates, input);
    const { places, ...served } = withHours(input, candidates, hours);
    const gathered = gatherMeal([askerPerson, ...friendPeople], places, { input, now, ...served }, this.travel);
    const answer = mealAnswer({
      input,
      now,
      people,
      ...gathered,
      menus: menusOf(collected.length, open.length, candidates.length),
      placeOf: (placeId) => this.placeOf(placeId),
      missing,
      served: menus,
    });
    const busy = this.busyOf(answer, people[0]?.items ?? [], input);
    const otherMeal = this.otherMealOf(collected, input, now);
    const touched = await this.touched(askerId, input, { now, kinds: [`meal-${meal}`], setAside: held?.id ?? null });
    return { answer: { ...answer, otherMeal, ...touched, mealSet: mealSetOf(held) }, served: menus, busy };
  }

  // The asker's items that fill the meal's time, when no time is free for it and no condition can be eased: with a
  // button to ease "지금", the model says only that.
  private busyOf({ noPlan }: AnswerReply, items: readonly DayItem[], { date, meal }: MealInput): BusyItem[] {
    const eased = (noPlan?.relax ?? []).length > 0;
    return noPlan?.reason === 'no-shared-time' && !eased ? busyIn(items, mealWindow(date, meal)) : [];
  }

  // Each candidate's hours for the meal, and its menu with the kept kinds of food of every open Restaurant's dishes.
  private async servedMenus(
    restaurants: readonly OpenRestaurant[],
    candidates: readonly { key: string }[],
    { date, meal }: MealInput,
  ): Promise<{ hours: (Hours | null)[]; menus: Map<string, ServedMenu> }> {
    const [hours, cuisines] = await Promise.all([
      Promise.all(candidates.map(({ key }) => this.hours.hoursOf(key, meal, date))),
      this.menus.cuisinesOf(restaurants.flatMap(({ lines }) => lines)),
    ]);
    return { hours, menus: servedOf(restaurants, candidates, { hours, cuisines }) };
  }

  // The other meal of the day, which the app's bar offers, and when it starts: its window's start, or now when it is under
  // way. None when it is over, or when no Restaurant with a Place serves it that day.
  private otherMealOf(
    collected: readonly RestaurantMenusDto[],
    { date, meal }: MealInput,
    now: Date,
  ): AnswerReply['otherMeal'] {
    const other = meal === 'lunch' ? 'dinner' : 'lunch';
    const { start, end } = mealWindow(date, other);
    if (end <= now || openRestaurants(collected, other, this.restaurantPlaces).length === 0) {
      return null;
    }
    return { meal: other, start: clockOf(start < now ? now : start) };
  }

  // The Place of a Restaurant named as the plans name it, null for one the seed does not place.
  restaurantPlaceId(name: string): string | null {
    return this.restaurantPlaces.placeOf(name)?.id ?? null;
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

  // The asker's Quest a plan sets aside, as the answer names it, and their other Quests of the day it touches: of the
  // kinds asked for, or with a Friend asked for (P05 ticket 17).
  async touched(
    askerId: string,
    { date, people, window }: MealInput | MeetInput,
    {
      now,
      kinds,
      setAside,
      setAsideChangeable,
    }: { now: Date; kinds: readonly KeptKind[]; setAside: string | null; setAsideChangeable?: boolean },
  ): Promise<Pick<AnswerReply, 'planSet' | 'related'>> {
    const kept = await keptQuestsOf(this.prisma, askerId, { date, now });
    const set = kept.find(({ questId }) => questId === setAside);
    const around = window.from === null ? now : onDay(date, window.from);
    const friendIds = people.slice(1).map(({ userId }) => userId);
    return {
      planSet:
        set === undefined
          ? null
          : { ...this.keptDtoOf(set), ...(setAsideChangeable === undefined ? {} : { changeable: setAsideChangeable }) },
      related: relatedOf(kept, { kinds, friendIds, around, setAside }).map((quest) => this.keptDtoOf(quest)),
    };
  }

  // A Quest of the asker's as the app reads it, its Place by its label.
  keptDtoOf(quest: KeptQuest): KeptQuestDto {
    const place = quest.placeId === null ? quest.placeLabel : placeLabelOf(this.placeOf(quest.placeId));
    return keptDto(quest, place, (placeId) => this.placeOf(placeId));
  }

  placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}
