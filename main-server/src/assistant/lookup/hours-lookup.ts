/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type Lookup } from '../dto/answer.dto.js';
import { onDay } from '../free-time/free-time.js';
import { dayWordsFrom } from '../korea-time.js';
import { type HoursFound, type HoursMeal, type MealWords, spanOf } from './hours-words.js';

// What the map draws of a Restaurant's hours: the Restaurant picked out, the camera on it, its label saying its state
// now ("학생회관식당 · 지금 닫음 · 08:00 아침"), as the menu Lookup draws its Restaurant: the pick's tag and a place flag
// at the same point, whose words after the name the map writes as the label's second line.

const MEAL_WORDS: Record<HoursMeal, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' };

const spanWords = (words: MealWords): string | null => {
  const span = spanOf(words);
  return span === null ? null : `${MEAL_WORDS[words.meal]} ${span.opensAt}–${span.closesAt}`;
};

// A meal whose day's menu is not posted yet, by the hours its page gives for that kind of day: "점심 11:30–14:00".
const usualWords = (words: MealWords): string | null =>
  words.serves === 'not known' ? `${MEAL_WORDS[words.meal]} ${words.usualOpensAt}–${words.usualClosesAt}` : null;

const saidOf = (meals: readonly MealWords[], words: (meal: MealWords) => string | null): string[] =>
  meals.flatMap((meal) => {
    const said = words(meal);
    return said === null ? [] : [said];
  });

// Meals not posted yet are said as usual ("평소 점심 11:30–14:00"): a day not posted is not a closed day.
function usualOf(meals: readonly MealWords[]): string | null {
  const usual = saidOf(meals, usualWords);
  return usual.length === 0 ? null : `평소 ${usual.join(' · ')}`;
}

// The state after the day it is of, "내일(수) 점심 11:30–13:30", as the meal Plan's time bar names it, whenever that is
// not today (P04 ticket 60): a follow-up keeps the day of the conversation, and the label says which.
const onTheDay = (date: string, now: Date, state: string): string => {
  const day = dayWordsFrom(date, now);
  return day === '' ? state : `${day} ${state}`;
};

// Today: serving until when, closed until the next meal, or done for the day. Another day: each meal's span, after the
// day. Closed only when the menus say so.
export function stateOf(found: HoursFound, now: Date): string {
  return onTheDay(found.date, now, todayOrSpans(found, now));
}

function todayOrSpans({ date, meals, servingNow }: HoursFound, now: Date): string {
  const served = meals.flatMap((words) => {
    const span = spanOf(words);
    return span === null ? [] : [{ meal: words.meal, ...span }];
  });
  const usual = usualOf(meals);
  if (servingNow === undefined) {
    const spans = [...saidOf(meals, spanWords), ...(usual === null ? [] : [usual])];
    return spans.length === 0 ? '쉬어요' : spans.join(' · ');
  }
  const serving = served.find(({ meal }) => meal === servingNow);
  if (serving !== undefined) {
    return `지금 영업 중 · ${serving.closesAt}까지`;
  }
  const next = served.find(({ opensAt }) => onDay(date, opensAt) > now);
  if (next !== undefined) {
    return `지금 닫음 · ${next.opensAt} ${MEAL_WORDS[next.meal]}`;
  }
  if (usual !== null) {
    return `메뉴 아직 안 올라옴 · ${usual}`;
  }
  return served.length === 0 ? '지금 닫음 · 오늘은 쉬어요' : '지금 닫음 · 오늘 영업 끝';
}

// Each meal's hours as the card's basis: "점심 11:30–14:00", by corner when the notes give them, and a meal not posted
// yet by its usual hours.
function basisOf({ meals }: HoursFound): string[] {
  return meals.flatMap((words) => {
    const meal = MEAL_WORDS[words.meal];
    if ('byCorner' in words) {
      const corners = words.byCorner.map(({ corner, opensAt, closesAt }) =>
        corner === null ? `${opensAt}–${closesAt}` : `${corner} ${opensAt}–${closesAt}`,
      );
      return [`${meal} ${corners.join(', ')}`];
    }
    const usual = usualWords(words);
    if (usual !== null) {
      return [`${usual} (평소, 그날 메뉴는 아직 안 올라옴)`];
    }
    const span = spanWords(words);
    return span === null ? [] : [span];
  });
}

// The meal asked about: its hours, serving now until when, the usual ones on a day not posted, or not served; after the
// day when that is not today.
export function mealStateOf(found: HoursFound, meal: HoursMeal, now: Date): string {
  return onTheDay(found.date, now, mealState(found, meal, now));
}

function mealState({ date, meals, servingNow }: HoursFound, meal: HoursMeal, now: Date): string {
  const name = MEAL_WORDS[meal];
  const words = meals.find((each) => each.meal === meal);
  if (words === undefined || words.serves === false) {
    return `${name}은 안 해요`;
  }
  const usual = usualWords(words);
  if (usual !== null) {
    return `평소 ${usual}`;
  }
  const span = spanOf(words);
  if (span === null) {
    return `${name} · 시간은 몰라요`;
  }
  const open = servingNow === meal && onDay(date, span.closesAt) > now;
  return open ? `${name} · 지금 영업 중 · ${span.closesAt}까지` : `${name} ${span.opensAt}–${span.closesAt}`;
}

// The Restaurant picked out, its label the meal asked about, or its state now when none was.
export function hoursLookup(found: HoursFound, place: PlaceDto, now: Date, meal?: HoursMeal): Lookup {
  const { restaurant } = found;
  const at = { latitude: place.latitude, longitude: place.longitude };
  const state = meal === undefined ? stateOf(found, now) : mealStateOf(found, meal, now);
  return {
    kind: 'place',
    chips: [],
    lines: [[{ text: restaurant, strong: true }], [{ text: state, strong: false }]],
    basis: basisOf(found),
    scene: {
      people: [],
      places: [{ place: { placeId: place.id, label: restaurant, ...at }, role: 'pick', tag: restaurant }],
      routes: [],
      flags: [{ at, text: `${restaurant} · ${state}`, role: 'place' }],
    },
    band: null,
    actions: [{ kind: 'guide', to: { placeId: place.id, label: restaurant, ...at } }],
    fact: true,
  };
}
