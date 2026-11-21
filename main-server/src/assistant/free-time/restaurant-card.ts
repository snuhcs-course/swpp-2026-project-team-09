/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { JoinPolicy } from '../../generated/prisma/client.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { type Hours } from '../../menus/restaurant-hours.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { koreaTime } from '../korea-time.js';
import { type ProposalFriend, type QuestProposal } from '../proposal.js';
import { type HandledMeal, type MealFit, type TravelShown } from './meal-fit.js';

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
    // The Restaurant's hours for the meal on that day, as its page last gave them for that kind of day; null when none
    // were kept. The lines leave the notes out, the hours' line among them.
    hours: Hours | null;
    people: TravelShown[];
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
    // A meal is not booked: the facilities of its building (301's study rooms) are not what it is for.
    place: { id: restaurant.place.id, name: placeWords(restaurant), booking: null },
    globalEvent: null,
    invitees,
  };
}

export function restaurantCard(
  restaurant: OpenRestaurant & MealFit,
  { date, meal, invitees, hours }: { date: string; meal: HandledMeal; invitees: ProposalFriend[]; hours: Hours | null },
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
      hours,
      people,
      proposal: mealProposal(restaurant, { meal, start, invitees }),
    },
  };
}
