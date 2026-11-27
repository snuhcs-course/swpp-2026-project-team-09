/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { PrismaService } from '../../common/prisma.service.js';
import { MenusService } from '../../menus/menus.service.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { heldMeetingOf, type MeetingAsked } from '../../quests/held-meeting.js';
import { type KeptQuest } from '../../quests/kept-quests.js';
import { StudySpacesService } from '../../study-spaces/study-spaces.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { type AnswerReply, type LeftOutClass, type MeetInput } from '../dto/answer.dto.js';
import { type DayItem, freeTimeOf, onDay } from '../free-time/free-time.js';
import { idsOn } from '../free-time/left-out-classes.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { keptWords } from '../lookup/day-quests.js';
import { openRestaurants } from '../free-time/meal-tools.js';
import { type AnswerPerson } from './answer-words.js';
import { type GatheringPerson, type GatheringPlace, MINUTE_MS } from './gathering.js';
import { MealPlanService } from './meal-plan.service.js';
import { meetAnswer } from './meet-answer.js';
import { gatherToMeet, meetingPlaces, meetWindow } from './meet-gathering.js';
import { locationPlaceOf, otherFriendsOf } from './other-friends.js';
import { conditionsOf } from './plan-conditions.js';

// 학생회관's Place number.
const STUDENT_CENTER = '63';

interface PlanAt {
  now: Date;
  location: Position | null;
  leftOut?: readonly string[];
  // The meeting to change, by its ref, as the model names it (P05 ticket 17, slice 2).
  questId?: string;
  // Only for an app that draws `planSet` (`plan-set`) is the asker's meeting looked for and set aside.
  setsAside?: boolean;
  // The conversation's Classes left out (P05 ticket 70).
  skipped?: readonly LeftOutClass[];
}

// A meet's plan as the tool reads it: the answer, its people's days, and the asker's meeting it would change.
export interface MeetPlanned {
  answer: AnswerReply;
  people: AnswerPerson[];
  held: MeetingAsked;
}

// The one place that gathers what a meet's plan needs, for the tool and the recalculation alike. Its people are read as
// a meal's are, through the Friend view.
@Injectable()
export class MeetPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly days: UserDayService,
    private readonly meals: MealPlanService,
    private readonly menus: MenusService,
    private readonly restaurantPlaces: RestaurantPlaces,
    private readonly places: PlaceLookup,
    private readonly studySpaces: StudySpacesService,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  // The asker's Classes of the day, among which a tool names a Class to leave out (P05 ticket 70).
  readonly classesOn = (askerId: string, date: string): Promise<DayItem[]> => this.days.classesOn(askerId, date);

  // `leftOut` names Sub Quests that stand in nobody's way, as a meal's plan takes them.
  async plan(askerId: string, input: MeetInput, at: PlanAt): Promise<AnswerReply> {
    return (await this.planned(askerId, input, at)).answer;
  }

  // The asker's meeting the plan would change: the one named, else the same meeting, around the start asked for.
  private heldOf(askerId: string, input: MeetInput, now: Date, questId: string | undefined): Promise<MeetingAsked> {
    const { date, people, window } = input;
    return heldMeetingOf(this.prisma, askerId, {
      date,
      now,
      friendIds: people.slice(1).map(({ userId }) => userId),
      ...(window.from === null ? {} : { around: onDay(date, window.from) }),
      ...(questId === undefined ? {} : { questId }),
    });
  }

  // Where a meet may be: 학생회관, the libraries the asker may use, and the Restaurants open that day.
  private placesOf(
    collected: Awaited<ReturnType<MenusService['findByDate']>>,
    buildings: Awaited<ReturnType<StudySpacesService['listFor']>>,
  ): ReturnType<typeof meetingPlaces> {
    const restaurants = (['lunch', 'dinner'] as const)
      .flatMap((meal) => openRestaurants(collected, meal, this.restaurantPlaces))
      .map(({ key, place }): GatheringPlace => ({ key, placeId: place.id }))
      .filter((restaurant, index, all) => all.findIndex(({ key }) => key === restaurant.key) === index);
    return meetingPlaces(
      {
        studentCenter: this.places.numbered(STUDENT_CENTER),
        libraries: buildings.map(({ place }) => place),
        restaurants,
      },
      (placeId) => this.meals.placeOf(placeId),
    );
  }

  // What the model is told of one of the asker's Quests, its Place by its label.
  wordsOf(kept: KeptQuest): object {
    return keptWords(kept, this.meals.keptDtoOf(kept).place);
  }

  // The asker's meeting the plan would change is set aside when they lead it: its Sub Quests stand in nobody's way, and
  // the answer names it (`planSet`) as one they may change.
  async planned(askerId: string, input: MeetInput, at: PlanAt): Promise<MeetPlanned> {
    const { friends, others: notInPlan } = await this.meals.friendsOf(askerId, input);
    const now = new Date(Math.ceil(at.now.getTime() / MINUTE_MS) * MINUTE_MS);
    const { date } = input;
    const [people, otherFriends, collected, buildings, held] = await Promise.all([
      this.meals.peopleOf(askerId, friends, date, at.location, idsOn(at.skipped ?? [], date)),
      otherFriendsOf(notInPlan, date, { days: this.days, travel: this.travel }),
      this.menus.findByDate(date),
      this.studySpaces.listFor(askerId),
      at.setsAside === true ? this.heldOf(askerId, input, now, at.questId) : null,
    ]);
    const setAside = held?.result === 'one' && held.meeting.kept.mine ? held.meeting : null;
    const leftOut = new Set([...(at.leftOut ?? []), ...(setAside?.subQuestIds ?? [])]);
    for (const person of [...people, ...otherFriends]) {
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
    const places = this.placesOf(collected, buildings);
    const when = { window: meetWindow(input), now };
    const gathering = gatherToMeet([asker, ...others], places, input.placeId, when, this.travel);
    const answer = meetAnswer({
      input,
      now,
      people,
      others: otherFriends,
      gathering,
      placeOf: (placeId) => this.meals.placeOf(placeId),
    });
    const touched = await this.meals.touched(askerId, input, {
      now,
      kinds: ['meet'],
      setAside: setAside?.kept.questId ?? null,
      setAsideChangeable: setAside !== null,
    });
    return { answer: { ...answer, ...touched }, people, held };
  }
}
