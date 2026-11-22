/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, ConditionChip } from '@/api/assistant-types';
import type { SubQuest } from '@/api/types';
import { koreaClock, koreaDayWord } from '@/korea-time';

// The words once a Plan was made into a Quest with Friends invited (P04 ticket 23, the feedback of 2026-11-22): whom it
// invited and to what, then when and where, and what comes next.

// The server writes a meal Plan's title as "<Restaurant>에서 <meal>".
const BEFORE_MEAL = '에서 ';
const MEALS = new Set(['점심', '저녁']);

// What the invitation is to: the meal the Quest's title names, else 약속.
export function invitedWordOf(title: string): string {
  const at = title.lastIndexOf(BEFORE_MEAL);
  const meal = at < 0 ? '' : title.slice(at + BEFORE_MEAL.length);
  return MEALS.has(meal) ? meal : '약속';
}

// Where the invitation is to: a meal's Restaurant as its title names it, else the Place of its step at `startAt`.
export function invitedPlaceOf(title: string, steps: readonly SubQuest[], startAt: string): string | null {
  const at = title.lastIndexOf(BEFORE_MEAL);
  if (at > 0 && invitedWordOf(title) !== '약속') {
    return title.slice(0, at);
  }
  const step = steps.find(({ startsAt }) => startsAt !== null && Date.parse(startsAt) === Date.parse(startAt));
  return step?.place?.label ?? null;
}

// The Friends of the conditions by their person chips' names, the words before " · " (`follow-ups.ts`).
export function invitedNamesOf(chips: readonly ConditionChip[]): string[] {
  return chips.flatMap(({ kind, text, userId }) =>
    kind === 'person' && userId !== null ? [text.split(' · ')[0] ?? text] : [],
  );
}

// "민수에게 점심 초대를 보냈어요", which the toast says too when the card is not on screen.
export function sentLineOf(names: readonly string[], word: string): string {
  return `${names.join(', ')}에게 ${word} 초대를 보냈어요`;
}

// What the toast says once the invitations went out while another answer is on screen: the card's first line.
export function sentToastOf(chips: readonly ConditionChip[], title: string): string {
  return sentLineOf(invitedNamesOf(chips), invitedWordOf(title));
}

// "모레(월) 14:00 학생회관식당 · 수락하면 알려 드려요": today's without its day word.
export function nextLineOf(startAt: string, place: string | null, now: Date): AnswerLine {
  const when = [koreaDayWord(startAt, now), koreaClock(startAt)].filter((part) => part !== '').join(' ');
  const where = place === null ? '' : ` ${place}`;
  return [
    { text: when, strong: true },
    { text: `${where} · 수락하면 알려 드려요`, strong: false },
  ];
}
