// AI-generated with Claude Opus 5.5, 2026-10-08, prompted by fyoon46
import type { Meal, MenuLine, RestaurantMenus } from '@/api/menu-types';
import type { Place } from '@/api/types';
import { type CardView, cardId } from '@/features/map/adapter';
import { koreaCalendar, koreaClock, koreaDateKey, koreaMinutes, koreaNextDay, WEEKDAYS } from '@/korea-time';
import { RESTAURANT_PLACES } from './restaurant-places';

export const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner'];

export const MEAL_NAMES: Readonly<Record<Meal, string>> = { breakfast: '아침', lunch: '점심', dinner: '저녁' };

// The meal served next, by Korea's clock, in minutes after midnight: breakfast until lunch, lunch from 10:00, dinner
// from 15:00, and tomorrow's breakfast from 20:00.
export const NEXT_MEAL_FROM = { breakfast: 0, lunch: 10 * 60, dinner: 15 * 60, tomorrow: 20 * 60 } as const;

export function nextMeal(now: Date): { date: string; meal: Meal } {
  const minutes = koreaMinutes(now);
  if (minutes >= NEXT_MEAL_FROM.tomorrow) {
    return { date: koreaDateKey(koreaNextDay(now)), meal: 'breakfast' };
  }
  const meal = minutes >= NEXT_MEAL_FROM.dinner ? 'dinner' : minutes >= NEXT_MEAL_FROM.lunch ? 'lunch' : 'breakfast';
  return { date: koreaDateKey(now), meal };
}

// "학생회관식당 · 오늘 점심 · 저녁": the meals that have lines today.
function servedToday({ meals }: RestaurantMenus): string {
  const served = meals.filter(({ lines }) => lines.length > 0).map(({ meal }) => MEAL_NAMES[meal]);
  return `오늘 ${served.join(' · ')}`;
}

function hasLines({ meals }: RestaurantMenus): boolean {
  return meals.some(({ lines }) => lines.length > 0);
}

function diningCard(place: Place, restaurants: readonly RestaurantMenus[]): CardView {
  const [first] = restaurants;
  if (first === undefined) {
    throw new Error('A Place without a restaurant has no card');
  }
  const alone = restaurants.length === 1;
  const where = place.number === null ? place.name : `${place.number}동`;
  const short = alone ? first.name : `${first.name} 외 ${restaurants.length - 1}곳`;
  return {
    id: cardId.dining(place.id),
    kind: 'dining',
    mark: { type: 'place', place: 'dining' },
    marker: { name: `식당 · ${short}`, short, count: 0, minutesOld: null },
    subLabel: `식당 · 학식 · ${where}`,
    title: alone ? first.name : place.name,
    lines: [
      { icon: 'pin', text: where },
      ...restaurants.map((restaurant) => ({
        icon: 'meal' as const,
        text: alone ? servedToday(restaurant) : `${restaurant.name} · ${servedToday(restaurant)}`,
      })),
    ],
    primary: { label: '메뉴 보기', action: 'menu', restaurant: first.name },
    secondary: null,
    position: { latitude: place.latitude, longitude: place.longitude },
  };
}

// One pin for each Place of the table that has a restaurant with menus today, in the order of the menus. Restaurants
// that share a Place share its pin.
export function toDiningCards(menus: readonly RestaurantMenus[], places: readonly Place[]): CardView[] {
  const byPlace = new Map<Place, RestaurantMenus[]>();
  for (const restaurant of menus.filter((menu) => hasLines(menu))) {
    const place = places.find(({ number }) => number !== null && number === RESTAURANT_PLACES[restaurant.name]);
    if (place !== undefined) {
      byPlace.set(place, [...(byPlace.get(place) ?? []), restaurant]);
    }
  }
  return [...byPlace].map(([place, restaurants]) => diningCard(place, restaurants));
}

// A line as the panel shows it: a dish with its name and its price as a row, or the line's text by its kind.
export type MenuLineView =
  { type: 'priced'; name: string; price: string } | { type: 'heading' | 'note' | 'plain'; text: string };

// "6,000원"
function won(price: number): string {
  return `${String(price).replaceAll(/\B(?=(?:\d{3})+$)/gu, ',')}원`;
}

function lineView({ text, kind, name, price }: MenuLine): MenuLineView {
  if (name !== null && price !== null) {
    return { type: 'priced', name, price: won(price) };
  }
  return { type: kind === 'heading' || kind === 'note' ? kind : 'plain', text };
}

export interface RestaurantView {
  name: string;
  // "63동", where the table places it.
  place: string | null;
  meals: Readonly<Record<Meal, MenuLineView[]>>;
}

export interface MenuDayView {
  restaurants: RestaurantView[];
  // "10월 6일 05:00에 가져온 메뉴예요", from the oldest collection of the day's restaurants; "" for an empty day.
  collected: string;
}

function collectedLine(menus: readonly RestaurantMenus[]): string {
  const [oldest] = menus.map(({ collectedAt }) => collectedAt).toSorted();
  if (oldest === undefined) {
    return '';
  }
  const { month, date } = koreaCalendar(new Date(oldest));
  return `${month}월 ${date}일 ${koreaClock(oldest)}에 가져온 메뉴예요`;
}

export function toMenuDay(menus: readonly RestaurantMenus[]): MenuDayView {
  return {
    restaurants: menus.map((restaurant) => {
      const number = RESTAURANT_PLACES[restaurant.name];
      const linesOf = (wanted: Meal): MenuLineView[] =>
        (restaurant.meals.find(({ meal }) => meal === wanted)?.lines ?? []).map((line) => lineView(line));
      return {
        name: restaurant.name,
        place: number === undefined ? null : `${number}동`,
        meals: { breakfast: linesOf('breakfast'), lunch: linesOf('lunch'), dinner: linesOf('dinner') },
      };
    }),
    collected: collectedLine(menus),
  };
}

export interface MenuDayTile {
  // "2026-10-06", as the main server takes it.
  key: string;
  // "오늘", "내일", or the weekday, "목".
  top: string;
  date: number;
  weekday: number;
  // What a screen reader says: "10월 6일 화요일".
  label: string;
}

// The 7 days from today that the panel offers.
export function menuDays(now: Date): MenuDayTile[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now.getTime() + index * 24 * 60 * 60 * 1000);
    const { month, date, weekday } = koreaCalendar(day);
    const name = WEEKDAYS[weekday] ?? '';
    return {
      key: koreaDateKey(day),
      top: index === 0 ? '오늘' : index === 1 ? '내일' : name,
      date,
      weekday,
      label: `${month}월 ${date}일 ${name}요일`,
    };
  });
}
