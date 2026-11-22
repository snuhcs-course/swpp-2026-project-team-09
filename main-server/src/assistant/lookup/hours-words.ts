/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MenuLineKind } from '../../generated/prisma/client.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { servedLines } from '../../menus/open-rule.js';
import { type Hours } from '../../menus/restaurant-hours.js';
import { clockOf, onDay } from '../free-time/free-time.js';
import { koreaDate } from '../korea-time.js';
import { othersText } from '../others-text.js';

// When a Restaurant serves each meal on a day, in the words the model is given: the hours its page gave for that kind of
// day, whether that day's menu serves the meal, and, today, whether it is serving now.

export type HoursMeal = 'breakfast' | 'lunch' | 'dinner';

export interface MealOfDay {
  meal: HoursMeal;
  // The day's lines of the meal; empty when none was collected.
  lines: readonly MenuLineDto[];
  hours: Hours | null;
}

type MealWords =
  | { meal: HoursMeal; serves: true; opensAt: string; closesAt: string }
  | { meal: HoursMeal; serves: true; hours: 'not recorded'; notes: string[] }
  | { meal: HoursMeal; serves: false; why: string; notes: string[] }
  | { meal: HoursMeal; serves: 'not known'; why: string; usualOpensAt: string; usualClosesAt: string };

const NOT_COLLECTED = "that day's menu is not collected yet; its page gives these hours for that kind of day";
const NOTES_ONLY = 'its menu that day holds only notes, so it does not serve it';

const notesOf = (lines: readonly MenuLineDto[]): string[] =>
  lines.filter(({ kind }) => kind === MenuLineKind.note).map(({ text }) => othersText('menu.line', text));

function mealWords({ meal, lines, hours }: MealOfDay): MealWords | null {
  if (lines.length === 0) {
    return hours === null
      ? null
      : { meal, serves: 'not known', why: NOT_COLLECTED, usualOpensAt: hours.opensAt, usualClosesAt: hours.closesAt };
  }
  if (servedLines(lines).length === 0) {
    return { meal, serves: false, why: NOTES_ONLY, notes: notesOf(lines) };
  }
  return hours === null
    ? { meal, serves: true, hours: 'not recorded', notes: notesOf(lines) }
    : { meal, serves: true, opensAt: hours.opensAt, closesAt: hours.closesAt };
}

// Serving now: the meal whose hours hold now, of a meal served that day.
function servingNow(meals: readonly MealWords[], date: string, now: Date): HoursMeal | null {
  const serving = meals.find(
    (each) => 'opensAt' in each && onDay(date, each.opensAt) <= now && now < onDay(date, each.closesAt),
  );
  return serving?.meal ?? null;
}

// The Restaurant's meals of the day, those with neither a menu nor hours left out; with `now` and what it serves now
// when the day is today.
export function hoursWords(restaurant: string, date: string, now: Date, meals: readonly MealOfDay[]): object {
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
