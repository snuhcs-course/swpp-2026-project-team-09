/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type LeftOutClass, type RequestContext, type TimeBand } from '../dto/answer.dto.js';
import { type Presented } from '../feature.js';
import { koreaTime } from '../korea-time.js';
import { byStart, clockOf, type DayItem } from './free-time.js';

// The asker's Classes the conversation leaves out ("1시 수업 휴강이야", P05 tickets 54 and 70): any tool that plans or
// fills a time names them by their start or their name, the server finds them among the asker's Classes of that day,
// and the conversation keeps them, whatever is asked next, until the User says they go. Every reading of the asker's
// day for a plan, a card or a band leaves them out; a Friend's Class is never left out, and the Timetable never changes.

const CLASS_WORDS_MAX = 12;

const classWords = z.array(z.string().min(1)).max(CLASS_WORDS_MAX);

// The parameters of every tool that reads the asker's day for a plan or a card.
export const skipParameters = {
  skipClasses: classWords
    .optional()
    .describe(
      "The User's own Classes of that day they say are cancelled or that they will skip (휴강이야, 수업 안 가, 째고, 빠질 거야), each by its start as HH:MM (1시 수업 → 13:00) or by its name as [Ahead: …] or the User says it (자료구조); several for 오후 수업 다. They are left out of this answer and of every later one in the conversation. Never a Friend's Class. Left out otherwise: those already left out stay out.",
    ),
  attendClasses: classWords
    .optional()
    .describe(
      'Classes left out earlier in the conversation that the User now says they go to (3시 수업은 가, 휴강 아니래), by start or name as skipClasses. Left out otherwise.',
    ),
};

export interface SkipWords {
  skipClasses?: readonly string[] | undefined;
  attendClasses?: readonly string[] | undefined;
}

// What a tool answers when a word names none of the asker's Classes of the day, or several: the model asks which.
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

// The conversation's Classes left out as the run knows them now: those a tool of this run named, else those the app
// sent, with a meal's conditions on screen from an app before the conversation kept them (P05 ticket 54).
export function leftOutNow({ context, presented }: { context: RequestContext; presented?: Presented }): LeftOutClass[] {
  if (presented?.leftOut !== undefined) {
    return presented.leftOut;
  }
  const { skipped = [], conditions } = context;
  const fromMeal =
    conditions?.kind === 'meal'
      ? (conditions.skipped ?? []).map((classId) => ({ date: conditions.date, classId }))
      : [];
  return withoutRepeats([...skipped, ...fromMeal]);
}

const withoutRepeats = (list: readonly LeftOutClass[]): LeftOutClass[] =>
  list.filter(
    (one, index) => list.findIndex(({ date, classId }) => date === one.date && classId === one.classId) === index,
  );

// The ids left out on `date`.
export const idsOn = (list: readonly LeftOutClass[], date: string): string[] =>
  list.filter((one) => one.date === date).map(({ classId }) => classId);

// The Classes of the day left out: those kept and those named, without those the User goes to. A word that names no
// Class of the day, or several, makes the tool ask instead.
export function skippedFor(
  classes: readonly DayItem[],
  { skipClasses = [], attendClasses = [] }: SkipWords,
  kept: readonly string[],
): { ids: string[] } | UnknownClass {
  const sorted = classes.toSorted(byStart);
  const unknown = [...skipClasses, ...attendClasses].filter((word) => named(sorted, word) === null);
  if (unknown.length > 0) {
    return { result: 'unknownClass', unknown, classes: sorted.map((item) => classSaid(item)) };
  }
  const idOf = (word: string): string | undefined => named(sorted, word)?.id;
  const going = new Set(attendClasses.map((word) => idOf(word)));
  const ids = [...new Set([...kept, ...skipClasses.map((word) => idOf(word))])];
  const theirs = new Set(sorted.map(({ id }) => id));
  return { ids: ids.filter((id): id is string => id !== undefined && theirs.has(id) && !going.has(id)) };
}

interface Asking {
  userId: string;
  date: string;
  context: RequestContext;
  presented: Presented;
}

// The Classes of `date` a tool leaves out, read from the asker's Classes only when one is named or already left out,
// and the conversation's list with that day's replaced, which the reply gives back. A reader without Classes (a test's)
// knows none.
export async function skipOf(
  classesOn: ((askerId: string, date: string) => Promise<DayItem[]>) | undefined,
  { userId, date, context, presented }: Asking,
  words: SkipWords,
): Promise<{ ids: string[]; classes: DayItem[] } | UnknownClass> {
  const list = leftOutNow({ context, presented });
  const kept = idsOn(list, date);
  const said = (words.skipClasses?.length ?? 0) + (words.attendClasses?.length ?? 0) > 0;
  if (!said && kept.length === 0) {
    return { ids: [], classes: [] };
  }
  const classes = (await classesOn?.(userId, date)) ?? [];
  const found = skippedFor(classes, words, kept);
  if ('result' in found) {
    return found;
  }
  if (said) {
    presented.leftOut = [
      ...list.filter((one) => one.date !== date),
      ...found.ids.map((classId) => ({ date, classId })),
    ];
  }
  return { ...found, classes };
}

// The ids of `date` as a planner takes them.
export const onDate = (date: string, ids: readonly string[]): LeftOutClass[] =>
  ids.map((classId) => ({ date, classId }));

// The Classes an answer leaves out, as the model says them, for its one sentence; nothing for none.
export function skippedWords(ids: readonly string[], classes: readonly DayItem[]): { skipped?: string[] } {
  const wanted = new Set(ids);
  const said = classes
    .filter(({ id }) => wanted.has(id))
    .toSorted(byStart)
    .map((item) => classSaid(item));
  return said.length === 0 ? {} : { skipped: said };
}

// What a planning tool needs of the Classes left out on `date`: those its planner leaves out, and the words of its
// answer; or the question of which Class a word means.
export async function skipFor(
  classesOn: ((askerId: string, date: string) => Promise<DayItem[]>) | undefined,
  asking: Asking,
  words: SkipWords,
): Promise<{ skipped: LeftOutClass[]; said: { skipped?: string[] } } | UnknownClass> {
  const skip = await skipOf(classesOn, asking, words);
  if ('result' in skip) {
    return skip;
  }
  return { skipped: onDate(asking.date, skip.ids), said: skippedWords(skip.ids, skip.classes) };
}

// The asker's items of the day without the Classes left out, which are free, and those Classes in time order; an id
// that is none of them is dropped.
export function skippedOut(
  items: readonly DayItem[],
  ids: readonly string[] = [],
): { items: readonly DayItem[]; skipped?: readonly DayItem[] } {
  const wanted = new Set(ids);
  const skipped = items.filter(({ id, isClass }) => isClass && wanted.has(id)).toSorted(byStart);
  return skipped.length === 0 ? { items } : { items: items.filter((item) => !skipped.includes(item)), skipped };
}

// A band's Classes left out, whole, each labelled as a lane's busy stretch; nothing for none.
export function skippedBand(
  skipped: readonly DayItem[] | undefined,
  label: (item: DayItem) => string,
): Pick<TimeBand, 'skipped'> {
  if (skipped === undefined || skipped.length === 0) {
    return {};
  }
  return {
    skipped: skipped.map((item) => ({
      id: item.id,
      startAt: koreaTime(item.start),
      endAt: koreaTime(item.end),
      label: label(item),
    })),
  };
}

// The line the model reads after the User's message while the conversation leaves Classes out, so that it knows the day
// as it now is: "[Classes left out: 2097-09-03 13:00 자료구조]". Empty for none.
export async function leftOutLines(
  classesOn: (askerId: string, date: string) => Promise<DayItem[]>,
  userId: string,
  list: readonly LeftOutClass[],
): Promise<string[]> {
  const dates = [...new Set(list.map(({ date }) => date))].toSorted();
  const said = await Promise.all(
    dates.map(async (date) => {
      const ids = new Set(idsOn(list, date));
      const classes = (await classesOn(userId, date)).filter(({ id }) => ids.has(id)).toSorted(byStart);
      return classes.map((item) => `${date} ${classSaid(item)}`);
    }),
  );
  const all = said.flat();
  return all.length === 0 ? [] : [`[Classes left out: ${all.join('; ')}]`];
}
