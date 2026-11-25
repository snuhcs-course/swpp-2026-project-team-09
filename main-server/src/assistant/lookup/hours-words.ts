/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MenuLineKind } from '../../generated/prisma/client.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { closureNotices, servedLines } from '../../menus/open-rule.js';
import { type Hours } from '../../menus/restaurant-hours.js';
import { clockOf, onDay } from '../free-time/free-time.js';
import { koreaDate } from '../korea-time.js';
import { othersText } from '../others-text.js';

// When a Restaurant serves each meal on a day, in the words the model is given: the hours its page gave for that kind of
// day, or the times its menu's notes give, each with the corner the note follows; whether that day's menu serves the
// meal; and, today, whether it is serving now.

export type HoursMeal = 'breakfast' | 'lunch' | 'dinner';

export interface MealOfDay {
  meal: HoursMeal;
  // The day's lines of the meal; empty when none was collected.
  lines: readonly MenuLineDto[];
  hours: Hours | null;
  // The Restaurant's menu that day has lines for some meal: a meal with none is then not served, not still to come.
  posted?: boolean;
}

// A time a note gives, with the corner of the dish line it follows ("A코너"), null when none.
export interface CornerHours extends Hours {
  corner: string | null;
}

export type MealWords =
  | { meal: HoursMeal; serves: true; opensAt: string; closesAt: string }
  | { meal: HoursMeal; serves: true; byCorner: CornerHours[] }
  | { meal: HoursMeal; serves: true; hours: 'not recorded'; notes: string[] }
  | { meal: HoursMeal; serves: false; why: string; notes: string[] }
  | { meal: HoursMeal; serves: 'not known'; why: string; usualOpensAt: string; usualClosesAt: string };

export interface HoursFound {
  result: 'found';
  restaurant: string;
  date: string;
  // Today only.
  now?: string;
  servingNow?: HoursMeal | null;
  meals: MealWords[];
}

const NOT_COLLECTED = "that day's menu is not collected yet; its page gives these hours for that kind of day";
const NOTES_ONLY = 'its menu that day holds only notes, so it does not serve it';
const CLOSED = 'its menu that day says it is closed for this meal, in the words of notes';
const NO_LINES = 'its menu that day has no line for this meal, so it does not serve it';

const notesOf = (lines: readonly MenuLineDto[]): string[] =>
  lines.filter(({ kind }) => kind === MenuLineKind.note).map(({ text }) => othersText('menu.line', text));

// "11:30 ~ 14:00", "11:30~14:00", "8:00-10:00".
const RANGE = /(\d{1,2}):(\d{2})\s*[~∼〜\-–]\s*(\d{1,2}):(\d{2})/u;
// "<A코너>제육김치덮밥".
const CORNER = /^\s*<([^>]+)>/u;

const clock = (hour: string, minute: string): string => `${hour.padStart(2, '0')}:${minute}`;

// The times the meal's notes give, each with the corner of the last dish line before it.
export function noteHours(lines: readonly MenuLineDto[]): CornerHours[] {
  let corner: string | null = null;
  const found: CornerHours[] = [];
  for (const { kind, text } of lines) {
    if (kind === MenuLineKind.note) {
      const range = RANGE.exec(text);
      if (range !== null) {
        const [, openHour = '', openMinute = '', closeHour = '', closeMinute = ''] = range;
        found.push({ corner, opensAt: clock(openHour, openMinute), closesAt: clock(closeHour, closeMinute) });
      }
    } else {
      corner = CORNER.exec(text)?.[1] ?? null;
    }
  }
  return found;
}

function servedWords(meal: HoursMeal, lines: readonly MenuLineDto[], hours: Hours | null): MealWords {
  if (hours !== null) {
    return { meal, serves: true, opensAt: hours.opensAt, closesAt: hours.closesAt };
  }
  const noted = noteHours(lines);
  const [only] = noted;
  if (noted.length === 1 && only !== undefined && only.corner === null) {
    return { meal, serves: true, opensAt: only.opensAt, closesAt: only.closesAt };
  }
  return noted.length > 0
    ? { meal, serves: true, byCorner: noted }
    : { meal, serves: true, hours: 'not recorded', notes: notesOf(lines) };
}

function mealWords({ meal, lines, hours, posted = false }: MealOfDay): MealWords | null {
  if (lines.length === 0 && posted) {
    return hours === null ? null : { meal, serves: false, why: NO_LINES, notes: [] };
  }
  if (lines.length === 0) {
    return hours === null
      ? null
      : { meal, serves: 'not known', why: NOT_COLLECTED, usualOpensAt: hours.opensAt, usualClosesAt: hours.closesAt };
  }
  if (servedLines(lines).length === 0) {
    const notices = closureNotices(lines);
    return notices.length === 0
      ? { meal, serves: false, why: NOTES_ONLY, notes: notesOf(lines) }
      : { meal, serves: false, why: CLOSED, notes: notices.map((text) => othersText('menu.line', text)) };
  }
  return servedWords(meal, lines, hours);
}

// The span a meal served that day is open: its hours, or from the earliest corner's opening to the latest's close.
export function spanOf(words: MealWords): Hours | null {
  if ('opensAt' in words) {
    return { opensAt: words.opensAt, closesAt: words.closesAt };
  }
  if (!('byCorner' in words)) {
    return null;
  }
  const opens = words.byCorner.map(({ opensAt }) => opensAt).toSorted();
  const closes = words.byCorner.map(({ closesAt }) => closesAt).toSorted();
  return { opensAt: opens[0] ?? '', closesAt: closes.at(-1) ?? '' };
}

// Serving now: the meal whose span holds now, of a meal served that day.
function servingNow(meals: readonly MealWords[], date: string, now: Date): HoursMeal | null {
  const serving = meals.find((each) => {
    const span = spanOf(each);
    return span !== null && onDay(date, span.opensAt) <= now && now < onDay(date, span.closesAt);
  });
  return serving?.meal ?? null;
}

// The Restaurant's meals of the day, those with neither a menu nor hours left out; with `now` and what it serves now
// when the day is today.
export function hoursWords(
  restaurant: string,
  date: string,
  now: Date,
  meals: readonly MealOfDay[],
): HoursFound | { result: 'none'; reason: string } {
  const said = meals.flatMap((each) => {
    const words = mealWords(each);
    return words === null ? [] : [words];
  });
  if (said.length === 0) {
    return {
      result: 'none',
      reason: `No menu of ${restaurant} was collected for ${date}, and its page never gave its hours.`,
    };
  }
  const today = koreaDate(now) === date ? { now: clockOf(now), servingNow: servingNow(said, date, now) } : {};
  return { result: 'found', restaurant, date, ...today, meals: said };
}
