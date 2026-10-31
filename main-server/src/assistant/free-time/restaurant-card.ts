/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { JoinPolicy } from '../../generated/prisma/client.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { koreaTime } from '../korea-time.js';
import { type ProposalFriend, type QuestProposal } from '../proposal.js';
import { type HandledMeal, type MealFit, type WayShown } from './meal-fit.js';

// A Restaurant card: what findMealRestaurants judged, and the 파티 its 파티 만들기 opens the form with, which the server
// fills so that no model call is needed. Older apps refuse a reply with one, as they refuse any card they do not know.

const MEAL_WORDS: Record<HandledMeal, string> = { lunch: '점심', dinner: '저녁' };

// A Restaurant open for the meal, with the lines that are not notes.
export interface OpenRestaurant {
  key: string;
  place: PlaceDto;
  lines: MenuLineDto[];
}

export interface RestaurantCard {
  kind: 'restaurant';
  restaurant: {
    key: string;
    name: string;
    placeNumber: string | null;
    date: string;
    meal: HandledMeal;
    eatingMinutes: number;
    lines: MenuLineDto[];
    people: WayShown[];
    proposal: QuestProposal;
  };
}

// The form shows "학생회관식당 (63동)".
function placeWords({ key, place: { number } }: OpenRestaurant): string {
  return number === null ? key : `${key} (${number}동)`;
}

function mealProposal(
  restaurant: OpenRestaurant,
  { meal, start, invitees }: { meal: HandledMeal; start: Date; invitees: ProposalFriend[] },
): QuestProposal {
  return {
    title: `${restaurant.key}에서 ${MEAL_WORDS[meal]}`,
    description: '',
    joinPolicy: JoinPolicy.closed,
    board: null,
    capacity: 1 + invitees.length,
    startsAt: koreaTime(start),
    place: { id: restaurant.place.id, name: placeWords(restaurant) },
    globalEvent: null,
    invitees,
  };
}

export function restaurantCard(
  restaurant: OpenRestaurant & MealFit,
  { date, meal, invitees }: { date: string; meal: HandledMeal; invitees: ProposalFriend[] },
): RestaurantCard {
  const { key, place, lines, start, eatingMinutes, people } = restaurant;
  return {
    kind: 'restaurant',
    restaurant: {
      key,
      name: key,
      placeNumber: place.number,
      date,
      meal,
      eatingMinutes,
      lines,
      people,
      proposal: mealProposal(restaurant, { meal, start, invitees }),
    },
  };
}
