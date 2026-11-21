/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { MenusService } from '../../menus/menus.service.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { StudySpacesService } from '../../study-spaces/study-spaces.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { type AnswerReply, type MeetInput } from '../dto/answer.dto.js';
import { freeTimeOf } from '../free-time/free-time.js';
import { openRestaurants } from '../free-time/meal-tools.js';
import { type GatheringPerson, type GatheringPlace, MINUTE_MS } from './gathering.js';
import { locationPlaceOf, MealPlanService } from './meal-plan.service.js';
import { meetAnswer } from './meet-answer.js';
import { gatherToMeet, meetingPlaces, meetWindow } from './meet-gathering.js';
import { conditionsOf } from './plan-conditions.js';

// 학생회관's Place number.
const STUDENT_CENTER = '63';

// The one place that gathers what a meet's plan needs, for the tool and the recalculation alike. Its people are read as
// a meal's are, through the Friend view.
@Injectable()
export class MeetPlanService {
  constructor(
    private readonly meals: MealPlanService,
    private readonly menus: MenusService,
    private readonly restaurantPlaces: RestaurantPlaces,
    private readonly places: PlaceLookup,
    private readonly studySpaces: StudySpacesService,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  // `leftOut` names Sub Quests that stand in nobody's way, as a meal's plan takes them.
  async plan(
    askerId: string,
    input: MeetInput,
    at: { now: Date; location: Position | null; leftOut?: readonly string[] },
  ): Promise<AnswerReply> {
    const friends = await this.meals.friendsOf(askerId, input);
    this.meals.refuseUnknownPlaces(input);
    const now = new Date(Math.ceil(at.now.getTime() / MINUTE_MS) * MINUTE_MS);
    const { date } = input;
    const [people, collected, buildings] = await Promise.all([
      this.meals.peopleOf(askerId, friends, date, at.location),
      this.menus.findByDate(date),
      this.studySpaces.listFor(askerId),
    ]);
    const leftOut = new Set(at.leftOut);
    for (const person of people) {
      person.items = person.items.filter(({ id }) => !leftOut.has(id));
    }
    const [asker, ...others] = people.map(({ userId, items, position }, index): GatheringPerson => ({
      id: userId,
      free: freeTimeOf(items, date, now),
      locationPlaceId: index === 0 ? this.meals.placeIdAt(position) : locationPlaceOf(friends[index - 1]),
      ...conditionsOf(input.people[index]?.constraints ?? [], date),
    }));
    if (asker === undefined) {
      throw new Error('A plan has its asker');
    }
    const restaurants = (['lunch', 'dinner'] as const)
      .flatMap((meal) => openRestaurants(collected, meal, this.restaurantPlaces))
      .map(({ key, place }): GatheringPlace => ({ key, placeId: place.id }))
      .filter((restaurant, index, all) => all.findIndex(({ key }) => key === restaurant.key) === index);
    const places = meetingPlaces(
      {
        studentCenter: this.places.numbered(STUDENT_CENTER),
        libraries: buildings.map(({ place }) => place),
        restaurants,
      },
      (placeId) => this.meals.placeOf(placeId),
    );
    const when = { window: meetWindow(input), now };
    const gathering = gatherToMeet([asker, ...others], places, input.placeId, when, this.travel);
    const answer = meetAnswer({ input, now, people, gathering, placeOf: (placeId) => this.meals.placeOf(placeId) });
    return { ...answer, ...(await this.meals.touched(askerId, input, { now, kinds: ['meet'], setAside: null })) };
  }
}
