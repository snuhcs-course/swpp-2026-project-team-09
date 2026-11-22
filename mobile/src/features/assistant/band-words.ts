/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TimeBand } from '@/api/assistant-types';
import { type BandBound, clockOf, type Stretch } from './time-band';

export interface BandWordsPart {
  text: string;
  strong: boolean;
}

// The main server's band words: "12:15–12:43", then " · 함께 28분" or " · 식사 28분" while the length is short enough to
// say (`meet-answer.ts`, `meal-scene.ts`).
const SPAN = /^\d{1,2}:\d{2}–\d{1,2}:\d{2}/u;
const LENGTH = /(함께|식사) \d+분/u;

const msOf = (at: string): number => Date.parse(at);

// The time bar's words where a handle has the band (P04 ticket 30): its own words where the Plan has it; elsewhere,
// while a handle is dragged or held after it is let go, the same words with the times and the length where it is
// drawn, the dragged end's time strong.
export function shownWordsOf(band: TimeBand, shown: Stretch, bound: BandBound | null): BandWordsPart[] {
  if (msOf(shown.startAt) === msOf(band.startAt) && msOf(shown.endAt) === msOf(band.endAt)) {
    return [{ text: band.text, strong: false }];
  }
  const minutes = Math.round((msOf(shown.endAt) - msOf(shown.startAt)) / 60_000);
  const rest = SPAN.test(band.text) ? band.text.replace(SPAN, '').replace(LENGTH, `$1 ${minutes}분`) : '';
  const from = clockOf(shown.startAt);
  const until = clockOf(shown.endAt);
  if (bound === 'from') {
    return [
      { text: from, strong: true },
      { text: `–${until}${rest}`, strong: false },
    ];
  }
  if (bound === 'until') {
    return [
      { text: `${from}–`, strong: false },
      { text: until, strong: true },
      { text: rest, strong: false },
    ].filter(({ text }) => text !== '');
  }
  return [{ text: `${from}–${until}${rest}`, strong: false }];
}

// The length at the words' end: " · 식사 1시간 12분", " · 함께 28분".
const LENGTH_TAIL = /\s·\s(함께|식사)\s[^·]*$/u;
// The meal named after the day: "내일(월) 점심".
const MEAL_NAME = /\s+(아침|점심|저녁)$/u;

// The bar's words shortened by `step` before they are cut at the bar's width (P04 ticket 37): 0 whole; 1 without the
// length; 2 without the meal's name after the day too. A dragged end's strong part stays; words that say who cannot
// come keep their tail, which is no length.
export function shortenedOf(
  day: string,
  parts: readonly BandWordsPart[],
  step: number,
): { day: string; parts: readonly BandWordsPart[] } {
  if (step < 1) {
    return { day, parts };
  }
  const short = parts
    .map(({ text, strong }) => ({ text: strong ? text : text.replace(LENGTH_TAIL, ''), strong }))
    .filter(({ text }) => text !== '');
  return { day: step < 2 ? day : day.replace(MEAL_NAME, ''), parts: short };
}
