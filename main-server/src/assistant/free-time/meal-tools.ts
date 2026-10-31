/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { type FriendDto } from '../../friends/dto/friends.dto.js';
import { Meal } from '../../generated/prisma/client.js';
import { type RestaurantMenusDto } from '../../menus/dto/restaurant-menus.dto.js';
import { servedLines } from '../../menus/open-rule.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type TravelProvider } from '../../travel/travel.js';
import { CARDS_MAX, defineTool, noneFound, type Tool, type ToolContext } from '../feature.js';
import { koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { freshIds } from '../tools/fresh-ids.js';
import { clockOf, endOfDay, type FreeInterval, freeTimeOf, onDay } from './free-time.js';
import { type FreeTimeServices } from './free-time-services.js';
import {
  aroundShared,
  byLongestTravel,
  type Diner,
  earliest,
  type HandledMeal,
  type Interval,
  longEnough,
  type MealFit,
  mealFitAt,
  mealWindow,
  overlapOf,
  sharedTime,
  windowOn,
} from './meal-fit.js';
import { type OpenRestaurant, restaurantCard } from './restaurant-card.js';
import { clockTime, dateInput, departurePlaceInput, leaveByInput, neededOf, noDay, outOfReach } from './tool-parts.js';
import { UserDayService } from './user-day.service.js';

// The meal side of the 공강 tools. Friends' Timetables are used without any switch, but only "free or not" comes out of
// here: never their Classes, their Places or why anyone is busy, and no Friend who is not free and no Restaurant that
// was left out.

const mealInput = z.enum([Meal.lunch, Meal.dinner]).describe('lunch or dinner.');

const windowInput = z
  .object({ from: clockTime, to: clockTime })
  .describe('A time window the User named, as HH:MM. It narrows the meal; it is not a single clock time.');

const friendIdsInput = z.array(z.uuid()).min(1);

const FRIEND_IDS = 'The Friends, as resolveFriend or findFreeFriends returned them in this message.';

function intervalAnswer({ start, end }: Interval, date: string): object {
  return { start: clockOf(start), end: end >= endOfDay(date) ? '24:00' : clockOf(end) };
}

// A person's Free Time that day.
async function freeOn(days: UserDayService, userId: string, date: string, now: Date): Promise<FreeInterval[]> {
  return freeTimeOf(await days.itemsOn(userId, date), date, now);
}

const intervalAnswers = (intervals: readonly Interval[], date: string): object[] =>
  intervals.map((interval) => intervalAnswer(interval, date));

// The Friends of the request, each once and in the order given, of those who are the User's accepted Friends.
function chosenFriends(listed: readonly FriendDto[], friendIds: readonly string[]): FriendDto[] {
  return [...new Set(friendIds)].flatMap((id) => listed.find((friend) => friend.id === id) ?? []);
}

const friendsInput = z
  .object({
    date: dateInput,
    meal: mealInput.optional(),
    window: windowInput.optional(),
    friendIds: friendIdsInput.optional().describe(`Only these Friends. ${FRIEND_IDS}`),
  })
  .describe('Give meal, or window when the User named a time of their own.');

export function findFreeFriends({ days, friends }: Pick<FreeTimeServices, 'days' | 'friends'>): Tool {
  return defineTool({
    description:
      "Finds who can eat with the User at a meal or in a window of a day from today to a week ahead. Answers result 'found' with the User's Free Time in that window (freeTime) and the Friends who are free with them, each with id, name, department and the overlap, or result 'none' with the reason. With friendIds it answers only those of them who are free and the time they all share with the User (shared). A Friend it does not return is not free: never say why.",
    input: friendsInput,
    run: async ({ date, meal, window, friendIds }, { userId, now, found }) => {
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      found.refuseUnfound('friend', friendIds ?? []);
      const narrowed = meal === undefined ? null : mealWindow(date, meal, window);
      const bounds = narrowed ?? (window === undefined ? null : windowOn(date, window));
      if (bounds === null) {
        return noneFound('Give a meal or a window.');
      }
      const freeTime = overlapOf(await freeOn(days, userId, date, now), [bounds]);
      const listed = await friends.listFriends(userId);
      const asked = friendIds === undefined ? listed : chosenFriends(listed, friendIds);
      const frees = await Promise.all(asked.map(({ id }) => freeOn(days, id, date, now)));
      const free = asked.flatMap((friend, index) => {
        const overlap = overlapOf(freeTime, frees[index] ?? []);
        return longEnough(overlap) ? [{ friend, overlap }] : [];
      });
      found.add(
        'friend',
        free.map(({ friend }) => friend.id),
      );
      return {
        result: 'found',
        freeTime: intervalAnswers(freeTime, date),
        friends: free.map(({ friend: { id, name, department }, overlap }) => ({
          id,
          name: othersText('friend.name', name),
          department: othersText('friend.department', department),
          overlap: intervalAnswers(overlap, date),
        })),
        ...(friendIds === undefined ? {} : { shared: intervalAnswers(sharedTime([freeTime, ...frees], bounds), date) }),
      };
    },
  });
}

const restaurantsInput = z.object({
  date: dateInput,
  meal: mealInput,
  friendIds: friendIdsInput.describe(FRIEND_IDS),
  window: windowInput.optional(),
  departurePlace: departurePlaceInput,
  leaveBy: leaveByInput,
});

type RestaurantConditions = z.output<typeof restaurantsInput>;

// The Restaurants considered: those with a Place, open for the meal.
function openRestaurants(
  collected: readonly RestaurantMenusDto[],
  meal: HandledMeal,
  restaurantPlaces: RestaurantPlaces,
): OpenRestaurant[] {
  return collected.flatMap(({ name, meals }) => {
    const place = restaurantPlaces.placeOf(name);
    const lines = servedLines(meals.find((served) => served.meal === meal)?.lines ?? []);
    return place === null || lines.length === 0 ? [] : [{ key: name, place, lines }];
  });
}

// The Restaurants that fit, in the order of the cards.
function fittingRestaurants(
  open: readonly OpenRestaurant[],
  diners: readonly Diner[],
  when: { shared: readonly Interval[]; window: Interval },
  travel: TravelProvider,
): (OpenRestaurant & MealFit)[] {
  return open
    .flatMap((restaurant) => {
      const fit = mealFitAt(restaurant.place.id, diners, when, travel);
      return fit === null ? [] : [{ ...restaurant, ...fit }];
    })
    .toSorted(byLongestTravel);
}

// The first shared interval decides. In a later one, a side without a Place is left out of the judgement.
function neededOfFirst({ free }: Diner, shared: readonly Interval[], conditions: RestaurantConditions): object | null {
  return neededOf(
    shared.slice(0, 1).map((interval) => aroundShared(free, interval)),
    conditions,
  );
}

async function dinersOf(
  { date, departurePlace, leaveBy }: RestaurantConditions,
  chosen: readonly FriendDto[],
  { userId, now }: Pick<ToolContext, 'userId' | 'now'>,
  days: UserDayService,
): Promise<[Diner, ...Diner[]]> {
  const [mine, ...theirs] = await Promise.all(
    [userId, ...chosen.map(({ id }) => id)].map((id) => freeOn(days, id, date, now)),
  );
  return [
    {
      name: '나',
      free: mine ?? [],
      departurePlace: departurePlace ?? null,
      leaveBy: leaveBy === undefined ? null : onDay(date, leaveBy),
    },
    ...chosen.map(({ name }, index) => ({ name, free: theirs[index] ?? [], departurePlace: null, leaveBy: null })),
  ];
}

function restaurantAnswer({ key, place, lines, start, eatingMinutes, people }: OpenRestaurant & MealFit): object {
  return {
    key,
    name: key,
    place: { id: place.id, name: place.name },
    lines: lines.map(({ text }) => othersText('menu.line', text)),
    start: koreaTime(start),
    eatingMinutes,
    people: people.map((person, index) =>
      index === 0 ? person : { ...person, name: othersText('friend.name', person.name) },
    ),
  };
}

function oldestCollection(collected: readonly RestaurantMenusDto[]): string {
  return koreaTime(earliest(collected.map(({ collectedAt }) => collectedAt)));
}

export function findMealRestaurants({ days, friends, menus, restaurantPlaces, travel }: FreeTimeServices): Tool {
  return defineTool({
    description:
      "Finds the Restaurants where the User and the Friends can eat a meal of a day from today to a week ahead: open then, with enough time to eat after everyone's way there, the one with the shortest longest way first. Answers result 'found' with the time they share (shared), when the menus were collected (collectedAt) and the Restaurants, each with its key, name, Place, menu lines, start, eatingMinutes and each person's Travel Time; or result 'needs' with the side (before or after) and the item without a Place, for which ask the User and call again with departurePlace or leaveBy; or result 'none' with the reason. Show them with showRestaurants.",
    input: restaurantsInput,
    run: async (conditions, context) => {
      const { date, meal, friendIds, window, departurePlace } = conditions;
      const { userId, now, found, restaurants } = context;
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      found.refuseUnfound('friend', friendIds);
      found.refuseUnfound('place', departurePlace === undefined ? [] : [departurePlace]);
      const collected = await menus.findByDate(date);
      if (collected.length === 0) {
        return { ...noneFound(`No menu was collected for ${date}.`), why: 'no-menu' };
      }
      const chosen = chosenFriends(await friends.listFriends(userId), friendIds);
      const diners = await dinersOf(conditions, chosen, context, days);
      const bounds = mealWindow(date, meal, window);
      const frees = diners.map(({ free }) => free);
      const shared = sharedTime(frees, bounds);
      if (shared.length === 0) {
        return { ...noneFound('They share no time then.'), why: 'no-shared-time' };
      }
      const needed = neededOfFirst(diners[0], shared, conditions);
      if (needed !== null) {
        return needed;
      }
      const open = openRestaurants(collected, meal, restaurantPlaces);
      const fitting = fittingRestaurants(open, diners, { shared, window: bounds }, travel);
      const invitees = chosen.map(({ id, name }) => ({ id, name }));
      // A second call of a run answers for the first: showRestaurants takes what this one judged.
      restaurants.clear();
      for (const restaurant of fitting) {
        found.add('restaurant', [restaurant.key]);
        found.add('place', [restaurant.place.id]);
        restaurants.set(restaurant.key, restaurantCard(restaurant, { date, meal, invitees }));
      }
      return {
        result: 'found',
        collectedAt: oldestCollection(collected),
        shared: intervalAnswers(shared, date),
        restaurants: fitting.map((restaurant) => restaurantAnswer(restaurant)),
      };
    },
  });
}

const showInput = z.object({
  keys: z
    .array(z.string().min(1))
    .min(1)
    .max(CARDS_MAX)
    .describe('The keys of the Restaurants to show, as findMealRestaurants returned them.'),
});

// A presenter: it adds the cards the server built for the Restaurants, in the order findMealRestaurants returned them.
export function showRestaurants(): Tool {
  return defineTool({
    description:
      "Shows Restaurants under your reply as cards with their menu, each person's Travel Time and 파티 만들기. Give only keys that findMealRestaurants returned in this message. Do not repeat the cards' details in your text.",
    input: showInput,
    run: ({ keys }, { found, presented, restaurants }) => {
      found.refuseUnfound('restaurant', keys);
      const fresh = freshIds(presented, 'restaurant', keys);
      const cards = [...restaurants.values()].filter(({ restaurant }) => fresh.includes(restaurant.key));
      presented.cards.push(...cards);
      return Promise.resolve({ result: 'shown', keys: cards.map(({ restaurant }) => restaurant.key) });
    },
  });
}
