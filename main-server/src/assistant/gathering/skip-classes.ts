/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type MealInput, type RequestContext } from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem } from '../free-time/free-time.js';

// The asker's Classes a meal leaves out for the conversation ("내일 1시 수업 휴강이야", P05 ticket 54): planMeal
// names them by their start or their name, the server finds them among the asker's Classes of the day, and the
// conditions on screen keep them for every plan of that day until the User says they go.

const CLASS_WORDS_MAX = 12;

const classWords = z.array(z.string().min(1)).max(CLASS_WORDS_MAX);

export const skipParameters = {
  skipClasses: classWords
    .optional()
    .describe(
      "The User's own Classes of that day they say are cancelled or that they will skip (휴강이야, 수업 안 가, 째고, 빠질 거야), each by its start as HH:MM (1시 수업 → 13:00) or by its name as [Ahead: …] or the User says it (자료구조); several for 오후 수업 다. The plan then leaves them out. Never a Friend's Class. Left out otherwise: those left out on screen for the same day stay out.",
    ),
  attendClasses: classWords
    .optional()
    .describe(
      'Classes left out on screen that the User now says they go to (3시 수업은 가), by start or name as skipClasses. Left out otherwise.',
    ),
};

// What planMeal answers when a word names none of the asker's Classes of the day, or several: the model asks which.
export interface UnknownClass {
  result: 'unknownClass';
  unknown: string[];
  classes: string[];
}

export const classSaid = ({ start, name }: DayItem): string => `${clockOf(start)} ${name}`;

// A start said as H:MM, made HH:MM.
const asClock = (word: string): string => (/^\d:\d\d$/u.test(word) ? `0${word}` : word);

// The one Class a word names: by its start, else by its whole name, else by a part of its name. Null for none or several.
function named(classes: readonly DayItem[], word: string): DayItem | null {
  const said = asClock(word.trim());
  const byClock = classes.filter(({ start }) => clockOf(start) === said);
  const byName = classes.filter(({ name }) => name === said);
  const byPart = classes.filter(({ name }) => name.includes(said));
  const [found, ...more] = [byClock, byName, byPart].find((matches) => matches.length > 0) ?? [];
  return found !== undefined && more.length === 0 ? found : null;
}

// The ids left out on screen for the same day, which a plan of any meal of it keeps.
function keptOf({ conditions }: RequestContext, date: string): string[] {
  return conditions?.kind === 'meal' && conditions.date === date ? (conditions.skipped ?? []) : [];
}

// The Classes the plan leaves out: those kept on screen and those named, without those the User goes to. A word that
// names no Class of the day, or several, makes it ask instead.
export function skippedFor(
  classes: readonly DayItem[],
  { skip = [], attend = [] }: { skip?: readonly string[]; attend?: readonly string[] },
  { context, date }: { context: RequestContext; date: string },
): { ids: string[] } | UnknownClass {
  const sorted = classes.toSorted(byStart);
  const unknown = [...skip, ...attend].filter((word) => named(sorted, word) === null);
  if (unknown.length > 0) {
    return { result: 'unknownClass', unknown, classes: sorted.map((item) => classSaid(item)) };
  }
  const idOf = (word: string): string | undefined => named(sorted, word)?.id;
  const going = new Set(attend.map((word) => idOf(word)));
  const ids = [...new Set([...keptOf(context, date), ...skip.map((word) => idOf(word))])];
  return { ids: ids.filter((id): id is string => id !== undefined && !going.has(id)) };
}

// The Classes an answer's input leaves out, as the model says them, for its one sentence; nothing for none.
export function skippedWords(input: MealInput | undefined, classes: readonly DayItem[]): { skipped?: string[] } {
  const ids = new Set(input?.skipped ?? []);
  const said = classes
    .filter(({ id }) => ids.has(id))
    .toSorted(byStart)
    .map((item) => classSaid(item));
  return said.length === 0 ? {} : { skipped: said };
}

// The Classes the plan leaves out, with the asker's Classes of the day read only when a Class is named or kept on
// screen. A planner without them (a test's) knows no Class.
export async function skipOf(
  plans: { classesOn?: (askerId: string, date: string) => Promise<DayItem[]> },
  { userId, date, context }: { userId: string; date: string; context: RequestContext },
  words: { skip?: readonly string[]; attend?: readonly string[] },
): Promise<{ ids: string[]; classes: DayItem[] } | UnknownClass> {
  const said = (words.skip?.length ?? 0) + (words.attend?.length ?? 0) > 0;
  if (!said && keptOf(context, date).length === 0) {
    return { ids: [], classes: [] };
  }
  const classes = (await plans.classesOn?.(userId, date)) ?? [];
  const found = skippedFor(classes, words, { context, date });
  return 'result' in found ? found : { ...found, classes };
}
