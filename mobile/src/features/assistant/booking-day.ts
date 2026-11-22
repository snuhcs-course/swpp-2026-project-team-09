/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest } from '@/api/types';
import { type Span, spanWords } from '@/library/cards/slot-band';
import { clockOf } from '@/library/cards/times';
import { koreaDateKey, koreaMinutes } from '@/korea-time';

// The study-seat bar's day: what the User already holds on the booking's date, so that the bar knows the day as a
// meal's bar does. Minutes are minutes of that day.

// A Class or a Quest of the date: from its start to its end, and the words that name it ("302동 수업", "저녁 약속").
export interface FixedThing {
  start: number;
  end: number;
  words: string;
  isClass: boolean;
}

export interface DayAround {
  // The nearest thing ended before the band, and the nearest one starting after it, named; null for none.
  before: string | null;
  after: string | null;
  // The first thing the band runs into ("15:30 수업과 겹쳐요"); null while it runs into none.
  clash: string | null;
}

const dateOf = (at: string): string => koreaDateKey(new Date(at));
const minutesOf = (at: string): number => koreaMinutes(new Date(at));

// A Class is named by its building ("302동 수업"), a Quest by its title.
function wordsOf(quest: Quest, place: string): string {
  return quest.classQuest ? `${place.split(' ')[0] ?? place} 수업` : quest.title;
}

// The fixed things of `date` from the User's Quests (GET /quests: their own, and today's Classes): each Sub Quest of
// that date, not cancelled, with a start and an end, by its start. A seat taken alone at exactly the band's own span is
// the booking itself, and is left out.
export function fixedOnDay(quests: readonly Quest[], date: string, own: Span): FixedThing[] {
  return quests
    .flatMap((quest) =>
      quest.subQuests.flatMap(({ startsAt, endsAt, cancelled, place }) => {
        if (startsAt === null || endsAt === null || cancelled || dateOf(startsAt) !== date) {
          return [];
        }
        const start = minutesOf(startsAt);
        const end = dateOf(endsAt) === date ? minutesOf(endsAt) : 24 * 60;
        const booking = quest.takenAlone === true && start === own.start && end === own.end;
        return booking ? [] : [{ start, end, words: wordsOf(quest, place?.label ?? ''), isClass: quest.classQuest }];
      }),
    )
    .toSorted((one, other) => one.start - other.start);
}

// Whether a word ends in a final consonant, for 과 after it and 와 otherwise.
function endsClosed(word: string): boolean {
  const code = word.codePointAt(word.length - 1) ?? 0;
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

function clashWords({ start, words, isClass }: FixedThing): string {
  const what = isClass ? '수업' : words;
  return `${clockOf(start)} ${what}${endsClosed(what) ? '과' : '와'} 겹쳐요`;
}

// The things around the band: the nearest one before, the nearest one after, and the first it runs into.
export function dayAround(fixed: readonly FixedThing[], span: Span): DayAround {
  const before = fixed.findLast(({ end }) => end <= span.start);
  const after = fixed.find(({ start }) => start >= span.end);
  const clash = fixed.find(({ start, end }) => start < span.end && end > span.start);
  return {
    before: before === undefined ? null : `${clockOf(before.end)} ${before.words} 끝`,
    after: after === undefined ? null : `${clockOf(after.start)} ${after.words}`,
    clash: clash === undefined ? null : clashWords(clash),
  };
}

// The band's words: its span and length, or its span and the thing it runs into, which the bar says in the warning
// colour. The booking is not stopped: the User may mean it.
export function wordsOn(span: Span, fixed: readonly FixedThing[]): { words: string; clash: boolean } {
  const { clash } = dayAround(fixed, span);
  return clash === null
    ? { words: spanWords(span), clash: false }
    : { words: `${clockOf(span.start)}–${clockOf(span.end)} · ${clash}`, clash: true };
}

// The fixed things as stretches on the track from its opening to its closing, cut to it; those outside are dropped.
export function stretchesOn(fixed: readonly FixedThing[], { open, close }: { open: number; close: number }): Span[] {
  return fixed
    .filter(({ start, end }) => end > open && start < close)
    .map(({ start, end }) => ({ start: Math.max(start, open), end: Math.min(end, close) }));
}
