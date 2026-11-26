/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type HeldMeal } from '../../quests/held-meal.js';
import { type KeptQuest } from '../../quests/kept-quests.js';
import { type AnswerReply, type MealInput } from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem } from '../free-time/free-time.js';
import { type Interval } from '../free-time/meal-fit.js';
import { koreaTime } from '../korea-time.js';

// What a meal's plan reads of the asker's own day beside the plan (P05 ticket 16): the Sub Quests it leaves out, the
// items that fill the meal when no time is free, and the meal already set.

// An item of the asker's that fills the meal's window, as the model is told it when no time is free.
export interface BusyItem {
  name: string;
  isClass: boolean;
  start: string;
  end: string;
}

// The asker's items of the day without the Classes the input leaves out (P05 ticket SKIPNUM), which are free for the
// meal, and those Classes in time order; an id that is none of them is dropped.
export function skippedOut(
  items: readonly DayItem[],
  ids: readonly string[] = [],
): { items: readonly DayItem[]; skipped?: readonly DayItem[] } {
  const wanted = new Set(ids);
  const skipped = items.filter(({ id, isClass }) => isClass && wanted.has(id)).toSorted(byStart);
  return skipped.length === 0 ? { items } : { items: items.filter((item) => !skipped.includes(item)), skipped };
}

// The input with only the Classes left out that are the asker's that day, and without the field for none.
export function withSkipped(input: MealInput, skipped: readonly DayItem[]): MealInput {
  const { skipped: _given, ...rest } = input;
  return skipped.length === 0 ? rest : { ...rest, skipped: skipped.map(({ id }) => id) };
}

// How far the time the Classes left out free reaches: to the first item left that starts at or after the first of them,
// or the meal's end, whichever is sooner.
export function freedReach(left: readonly DayItem[], skipped: readonly DayItem[], mealEnd: Date): Date {
  const [first] = skipped;
  const next = first === undefined ? undefined : left.toSorted(byStart).find(({ start }) => start >= first.start);
  return next !== undefined && next.start < mealEnd ? next.start : mealEnd;
}

// Leaves these Sub Quests out of everyone's day.
export function leaveOut(people: readonly { items: readonly DayItem[] }[], subQuestIds: readonly string[]): void {
  const leftOut = new Set(subQuestIds);
  for (const person of people) {
    person.items = person.items.filter(({ id }) => !leftOut.has(id));
  }
}

export const busyIn = (items: readonly DayItem[], { start, end }: Interval): BusyItem[] =>
  items
    .filter((item) => item.start < end && item.end > start)
    .map(({ name, isClass, start: from, end: to }) => ({ name, isClass, start: clockOf(from), end: clockOf(to) }));

// The meal the asker already holds for the day, as the answer names it: its Restaurant is the title's, "302동식당" of
// "302동식당에서 점심".
export function mealSetOf(held: HeldMeal | null): AnswerReply['mealSet'] {
  if (held === null) {
    return null;
  }
  const { id, title, startsAt, others } = held;
  return {
    questId: id,
    title,
    startAt: koreaTime(startsAt),
    place: title.replace(/에서 (점심|저녁)$/u, ''),
    friendNames: others,
    shared: others.length > 0,
  };
}

// Whether a plan for these Friends is for the set-aside Quest's people, as `PUT /plans/:questId` takes it
// (better-plan.service.ts): every other in it or invited is asked for, and perhaps Friends more, those who declined
// among them, whom the press invites (P05 ticket 44).
function forItsPeople({ people }: Pick<KeptQuest, 'people'>, friendIds: readonly string[]): boolean {
  return people.every(({ userId, answer }) => answer === 'declined' || friendIds.includes(userId));
}

// Whether 바꾸기 changes the meal set aside in place (P05 ticket 31): the asker may change it, the plans are for its
// people, and, when others are in it, the app draws 바꾸기 (`drawsChange`). An app without it has only the plan's
// button, which makes a second meal beside a shared one, so a shared meal is never offered to change there.
export function mealChangeable(
  set: Pick<KeptQuest, 'people' | 'changeable'>,
  friendIds: readonly string[],
  drawsChange: boolean,
): boolean {
  const shared = set.people.some(({ answer }) => answer !== 'declined');
  return set.changeable && forItsPeople(set, friendIds) && (drawsChange || !shared);
}
