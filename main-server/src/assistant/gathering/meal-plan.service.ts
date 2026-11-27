/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { PrismaService } from '../../common/prisma.service.js';
import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { type Cuisines } from '../../menus/cuisine-words.js';
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
  type LeftOutClass,
  type LocationMissing,
  type MealInput,
  type MeetInput,
} from '../dto/answer.dto.js';
import { type DayItem, freeTimeOf, onDay } from '../free-time/free-time.js';
import { mealWindow } from '../free-time/meal-fit.js';
import { openRestaurants } from '../free-time/meal-tools.js';
import { type OpenRestaurant } from '../free-time/restaurant-card.js';
import { idsOn, skippedOut } from '../free-time/left-out-classes.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { keptDto } from '../lookup/day-quests.js';
import { type GatheringPerson, MINUTE_MS } from './gathering.js';
import { addingDto, addingOf, type Asked, askedFor, candidatesOf } from './meal-adding.js';
import { type AnswerPerson, mealAnswer, menusOf } from './meal-answer.js';
import { type ServedMenu } from './meal-menu.js';
import { type BusyItem, busyIn, leaveOut, mealChangeable, mealSetOf, withSkipped } from './meal-plan-parts.js';
import { type BesideServices, besideOf } from './meal-beside.js';
import { type MissingInputs } from './missing-inputs.js';
import { locationPlaceOf, otherFriendsOf } from './other-friends.js';
import { placeLabelOf } from './place-naming.js';
import { relatedOf } from './related-quests.js';
import { conditionsOf } from './plan-conditions.js';
import { gatherMeal, withHours } from './unmet-plans.js';

// The one place that gathers what a meal's plan needs: the tool, the recalculation, and the making of a Quest call it,
// so that the three agree.

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
  // The app draws 바꾸기 for `planSet` (`plan-set`): only then is a meal shared with others changeable (P05 ticket 31).
  setsAside?: boolean;
  // The conversation's Classes left out (P05 ticket 70), beside the input's own.
  skipped?: readonly LeftOutClass[];
}

// Who may set a person's constraint: the asker, and for the asker alone also the step before (P05 ticket 74).
const setBy = (index: number, source: string): boolean => source === 'asker' || (index === 0 && source === 'step');

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
    given: MealInput,
    at: PlanAt,
  ): Promise<{ answer: AnswerReply; served: ReadonlyMap<string, ServedMenu>; busy?: BusyItem[]; posted?: boolean }> {
    const { friends, others: notInPlan } = await this.friendsOf(askerId, given);
    const now = new Date(Math.ceil(at.now.getTime() / MINUTE_MS) * MINUTE_MS);
    const { date, meal } = given;
    const [people, others, collected, missing, held] = await Promise.all([
      this.peopleOf(askerId, friends, date, at.location, [...(given.skipped ?? []), ...idsOn(at.skipped ?? [], date)]),
      otherFriendsOf(notInPlan, date, { days: this.days, travel: this.travel }),
      this.menus.findByDate(date),
      this.missingOf(askerId, at),
      heldMealOf(this.prisma, askerId, given),
    ]);
    leaveOut([...people, ...others], [...(at.leftOut ?? []), ...(held?.subQuestIds ?? [])]);
    const { adding, asked: input } = addingOf(held, withSkipped(given, people[0].skipped ?? []));
    const [askerPerson, ...friendPeople] = people.map(({ userId, items, position }, index): GatheringPerson => ({
      id: userId,
      free: freeTimeOf(items, date, now),
      locationPlaceId: index === 0 ? this.placeIdAt(position) : locationPlaceOf(friends[index - 1]),
      ...(index === 0 ? { positionOnly: true as const } : {}),
      ...conditionsOf(given.people[index]?.constraints ?? [], date),
    }));
    if (askerPerson === undefined) {
      throw new Error('A plan has its asker');
    }
    const restaurants = openRestaurants(collected, meal, this.restaurantPlaces);
    const open = restaurants.map(({ key, place }) => ({ key, placeId: place.id }));
    const candidates = candidatesOf(open, input.placeId, adding);
    const { hours, menus } = await this.servedMenus(restaurants, candidates, input);
    const { places, ...served } = withHours(input, candidates, hours);
    const gathered = gatherMeal([askerPerson, ...friendPeople], places, { input, now, ...served }, this.travel);
    const answer = mealAnswer({
      input,
      now,
      people,
      others,
      ...gathered,
      menus: menusOf(collected.length, open.length, candidates.length),
      placeOf: (placeId) => this.placeOf(placeId),
      missing,
      served: menus,
    });
    const busy = this.busyOf(answer, people[0]?.items ?? [], input);
    const beside = await besideOf(collected, { input, now, people: [askerPerson, ...friendPeople] }, this.beside);
    const touched = await this.touched(askerId, input, { ...at, now, kinds: [`meal-${meal}`], setAside: held?.id });
    const set = { ...touched, mealSet: mealSetOf(held), ...addingDto(adding, people, answer.plans) };
    return { answer: { ...answer, ...beside, ...set }, served: menus, busy, posted: collected.length > 0 };
  }

  // The input as planMeal plans it (P05 ticket 44): with everyone of the meal the asker holds that day when the User asked
  // for a Friend new to it, so that the Friend is added to it; or, for a User who holds no such meal but was invited to
  // one and asked for a Friend, that meal, of which nothing is planned. `alreadyIn` names the Friends asked for who are
  // in the meal held or invited to it.
  readonly asked = (askerId: string, input: MealInput): Promise<Asked> => askedFor(this.prisma, askerId, input);

  // The asker's Classes of the day, which planMeal names a Class to leave out among.
  readonly classesOn = (askerId: string, date: string): Promise<DayItem[]> => this.days.classesOn(askerId, date);

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

  // What `besideOf` reads the Restaurants with.
  private get beside(): BesideServices {
    return { restaurantPlaces: this.restaurantPlaces, hours: this.hours, travel: this.travel };
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

  // The Friends of the plan, in its order, and the asker's other Friends, in the order of their list, refusing a plan
  // that does not start with the asker, names anyone else or anyone twice, holds a constraint the asker did not set, or
  // names a Place there is not. A meet's people are read the same way.
  async friendsOf(
    askerId: string,
    input: Pick<MealInput, 'people' | 'placeId'>,
  ): Promise<{ friends: FriendView[]; others: FriendView[] }> {
    const [first, ...named] = input.people;
    if (first?.userId !== askerId) {
      throw new BadRequestException('The first person of a plan is the asker');
    }
    if (new Set(input.people.map(({ userId }) => userId)).size < input.people.length) {
      throw new BadRequestException('A person is in a plan once');
    }
    if (input.people.some(({ constraints }, index) => constraints.some(({ source }) => !setBy(index, source)))) {
      throw new BadRequestException('Only the asker sets constraints');
    }
    const listed = await this.friends.list(askerId);
    const friends = named.map(({ userId }) => {
      const friend = listed.find(({ id }) => id === userId);
      if (friend === undefined) {
        throw new BadRequestException("Only the asker's Friends can be in a plan");
      }
      return friend;
    });
    this.refuseUnknownPlaces(input);
    return { friends, others: listed.filter(({ id }) => !friends.some((friend) => friend.id === id)) };
  }

  private refuseUnknownPlaces({ placeId, people }: Pick<MealInput, 'placeId' | 'people'>): void {
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
    skippedIds: readonly string[] = [],
  ): Promise<[AnswerPerson, ...AnswerPerson[]]> {
    const [asker, mine, ...theirs] = await Promise.all([
      this.users.findById(askerId),
      this.days.itemsOn(askerId, date),
      ...friends.map(({ id }) => this.days.itemsOn(id, date)),
    ]);
    return [
      { userId: askerId, name: asker.name, me: true, ...skippedOut(mine, skippedIds), position: location },
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
      setsAside = false,
    }: {
      now: Date;
      kinds: readonly KeptKind[];
      setAside: string | null | undefined;
      setAsideChangeable?: boolean;
      // The app draws 바꾸기 (`plan-set`), which a meal shared with others needs to be changeable.
      setsAside?: boolean;
    },
  ): Promise<Pick<AnswerReply, 'planSet' | 'related'>> {
    const kept = await keptQuestsOf(this.prisma, askerId, { date, now });
    const set = kept.find(({ questId }) => questId === setAside);
    const around = window.from === null ? now : onDay(date, window.from);
    const friendIds = people.slice(1).map(({ userId }) => userId);
    return {
      planSet:
        set === undefined
          ? null
          : {
              ...this.keptDtoOf(set),
              changeable: setAsideChangeable ?? mealChangeable(set, friendIds, setsAside),
            },
      related: relatedOf(kept, { kinds, friendIds, around, setAside: setAside ?? null }).map((quest) =>
        this.keptDtoOf(quest),
      ),
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
