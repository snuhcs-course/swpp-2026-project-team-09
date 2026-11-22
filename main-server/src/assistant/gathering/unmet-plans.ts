/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Hours } from '../../menus/restaurant-hours.js';
import { SHORTEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { type MealInput } from '../dto/answer.dto.js';
import { clockOf, type DayItem, onDay } from '../free-time/free-time.js';
import { earliest, type Interval, latest, mealWindow } from '../free-time/meal-fit.js';
import {
  gather,
  type Gathering,
  type GatheringPerson,
  type GatheringPlace,
  type GatheringTravel,
  MINUTE_MS,
} from './gathering.js';
import { windowOf } from './plan-conditions.js';

// The calculation of a meal whose conditions cannot all be met (P02-14): a Restaurant's own hours, a meal "now"
// (지금) that nobody can make and the conditions to ease, and the asker alone free now too briefly to eat.

// A meal 지금 lies in a stretch everyone shares that starts at most this long after now.
export const NOW_MINUTES = 30;

// The start offered for a meal 지금 that nobody can make is rounded up to the half hour, as the time band marks it.
const RELAX_STEP_MINUTES = 30;

type Walking = GatheringTravel;

// A condition to ease, as the words of the answer name it.
export type Relax = { kind: 'without'; userId: string } | { kind: 'from'; time: string };

export interface Unmet {
  // With 지금 and nothing by then: the conditions to ease, Friends left out first; null otherwise.
  relax: Relax[] | null;
  // Then, whose day keeps the meal from now: the first Friend to leave out, else the asker when alone they cannot
  // eat by then either.
  blocker: string | null;
  // The asker alone, free now only until this item, too soon to eat before it.
  tooSoon: DayItem | null;
  // When the first Restaurant serves the meal, whatever the User fixed.
  opensAt: Date;
}

const NOTHING_UNMET: Omit<Unmet, 'opensAt'> = { relax: null, blocker: null, tooSoon: null };

const plusMinutes = (at: Date, minutes: number): Date => new Date(at.getTime() + minutes * MINUTE_MS);

// The latest start of a meal 지금 when no start is fixed: a fixed one has eased 지금 to it.
export function startsByOf({ window }: MealInput, now: Date): Date | undefined {
  return window.now === true && window.from === null ? plusMinutes(now, NOW_MINUTES) : undefined;
}

// Each Restaurant's window: its own hours narrowed by what the User fixed, else the meal's. The gathering's window
// holds them all. Without hours, the places come back as they are. `opensAt` is the earliest any of them opens.
export function withHours(
  input: MealInput,
  places: readonly GatheringPlace[],
  hours: readonly (Hours | null)[],
): { places: GatheringPlace[]; window: Interval; opensAt: Date } {
  const meal = windowOf(input);
  const { date, window: fixed } = input;
  const served = mealWindow(date, input.meal).start;
  if (hours.every((each) => each === null)) {
    return { places: [...places], window: meal, opensAt: served };
  }
  const withWindows = places.map((place, index): GatheringPlace => {
    const own = hours[index] ?? null;
    if (own === null) {
      return { ...place, window: meal };
    }
    const closesAt = onDay(date, own.closesAt);
    const start = fixed.from === null ? [] : [onDay(date, fixed.from)];
    const end = fixed.until === null ? [] : [onDay(date, fixed.until)];
    const window = { start: latest([onDay(date, own.opensAt), ...start]), end: earliest([closesAt, ...end]) };
    return { ...place, window, closesAt };
  });
  const windows = withWindows.map(({ window }) => window ?? meal);
  const openings = hours.map((own) => (own === null ? served : onDay(date, own.opensAt)));
  return {
    places: withWindows,
    window: { start: earliest(windows.map(({ start }) => start)), end: latest(windows.map(({ end }) => end)) },
    opensAt: earliest(openings),
  };
}

// The asker's stretch of Free Time that holds now, when it ends at an item and no Restaurant, whatever its hours,
// fits a meal before it.
function tooSoonOf(
  asker: GatheringPerson,
  places: readonly GatheringPlace[],
  now: Date,
  travel: Walking,
): DayItem | null {
  const current = asker.free.find(({ start, end }) => start <= now && now < end);
  if (current?.next === undefined || current.next === null) {
    return null;
  }
  const bare = places.map(({ key, placeId }) => ({ key, placeId }));
  const window = { start: now, end: current.end };
  return gather([asker], bare, { window, now }, travel).fits.length === 0 ? current.next : null;
}

// When everyone is free next with a Restaurant that fits, rounded up for the button unless that leaves no meal.
function laterFrom(gathering: Gathering): string | null {
  const [best] = gathering.fits;
  if (gathering.shared === null || best === undefined) {
    return null;
  }
  const step = RELAX_STEP_MINUTES * MINUTE_MS;
  const rounded = new Date(Math.ceil(gathering.shared.start.getTime() / step) * step);
  const fits = best.end.getTime() - rounded.getTime() >= SHORTEST_MEAL_SECONDS * 1000;
  return clockOf(fits ? rounded : gathering.shared.start);
}

type People = readonly [GatheringPerson, ...GatheringPerson[]];

interface Asked {
  places: readonly GatheringPlace[];
  when: { window: Interval; now: Date };
  travel: Walking;
}

// Each Friend whose leaving out lets the rest eat by `startsBy`, then when everyone is free next. Nobody's day keeps
// the meal from now when no Restaurant serves it by then.
function notNow(people: People, { places, when, travel }: Asked, startsBy: Date): Omit<Unmet, 'opensAt'> {
  const [asker, ...friends] = people;
  const fitsBy = (some: People): boolean => gather(some, places, when, travel, { startsBy }).fits.length > 0;
  const left = friends.filter(({ id }) => fitsBy([asker, ...friends.filter((friend) => friend.id !== id)]));
  const from = laterFrom(gather(people, places, when, travel));
  const relax: Relax[] = [
    ...left.map(({ id }) => ({ kind: 'without' as const, userId: id })),
    ...(from === null ? [] : [{ kind: 'from' as const, time: from }]),
  ];
  const served = when.window.start <= startsBy;
  const blocker = served ? (left[0]?.id ?? (fitsBy([asker]) ? null : asker.id)) : null;
  return { relax, blocker, tooSoon: null };
}

interface Gathered {
  gathering: Gathering;
  unmet: Unmet;
  // The asker's longest meal alone under the same conditions, when Friends are in the plan; null otherwise or when
  // none fits.
  aloneMinutes: number | null;
}

// The gathering of a meal, the asker first: with 지금 and no start fixed, only a stretch that starts soon is planned,
// and nothing fitting it gives the conditions to ease. The asker alone, with nothing fixed, learns of a Class too soon.
export function gatherMeal(
  people: People,
  places: readonly GatheringPlace[],
  { input, now, window, opensAt }: { input: MealInput; now: Date; window: Interval; opensAt: Date },
  travel: Walking,
): Gathered {
  const when = { window, now };
  const startsBy = startsByOf(input, now);
  const gathering = gather(people, places, when, travel, { startsBy });
  const [asker] = people;
  const aloneFits = people.length === 1 ? [] : gather([asker], places, when, travel, { startsBy }).fits;
  const aloneMinutes =
    aloneFits.length === 0 ? null : Math.max(...aloneFits.map(({ togetherMinutes }) => togetherMinutes));
  if (startsBy !== undefined) {
    const unmet = gathering.fits.length > 0 ? NOTHING_UNMET : notNow(people, { places, when, travel }, startsBy);
    return { gathering, unmet: { ...unmet, opensAt }, aloneMinutes };
  }
  const { from, until, now: soon = false } = input.window;
  const alone = people.length === 1 && !soon && from === null && until === null;
  const tooSoon = alone ? tooSoonOf(asker, places, now, travel) : null;
  return { gathering, unmet: { ...NOTHING_UNMET, tooSoon, opensAt }, aloneMinutes };
}
