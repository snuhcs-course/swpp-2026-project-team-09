/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MeetInput, type TimeBand } from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { type Interval, mealWindow } from '../free-time/meal-fit.js';
import { koreaTime } from '../korea-time.js';
import { type GatheringArgs, type GatheringNaming, type Naming, type OtherFriend } from './answer-words.js';
import { MINUTE_MS } from './gathering.js';
import { halfHoursAround, lanesOf, otherLane, skippedOf } from './meal-scene.js';
import { meetHours, meetWindow } from './meet-gathering.js';
import { windowOf } from './plan-conditions.js';

// The time band of an answer with no plan (P05 ticket 65), so that its time card stays and the User can change the
// window, the people or the Classes left out there.

export type BandRows = Pick<TimeBand, 'lanes' | 'others' | 'skipped'>;

// Everyone's lanes over the window asked, from now when it has begun, and the window as the band's stretch.
export function windowBand(window: Interval, now: Date, rowsOf: (from: Date, until: Date) => BandRows): TimeBand {
  const minute = new Date(Math.ceil(now.getTime() / MINUTE_MS) * MINUTE_MS);
  const start = window.start < minute && minute < window.end ? minute : window.start;
  const end = window.end > start ? window.end : start;
  const { from, until } = halfHoursAround(start.getTime(), end.getTime());
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    ...rowsOf(from, until),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    text: `${clockOf(start)}–${clockOf(end)}`,
  };
}

// The asker's other Friends over the range, with no walk: there is no Place to walk to.
export function othersWithoutPlace(
  others: readonly OtherFriend[] | undefined,
  range: { from: Date; until: Date; label: (placeId: string) => string },
): Pick<TimeBand, 'others'> {
  if (others === undefined) {
    return {};
  }
  return { others: others.map((other) => otherLane(other, { walkMinutes: null, after: null }, range)) };
}

// A no-plan answer with its band; an answer with a plan has none.
export function withBand(noPlan: AnswerReply['noPlan'], bandOf: () => TimeBand): AnswerReply['noPlan'] {
  return noPlan === null ? null : { ...noPlan, band: bandOf() };
}

// A meal's: the meal's window as the User narrowed it, or the meal's own when that left none, and the Classes left out.
export function mealNoPlanBand(naming: Naming): TimeBand {
  const { input, now, others } = naming.args;
  const asked = windowOf(input);
  const { skipped = [] } = naming.asker;
  const label = (placeId: string): string => naming.placeLabel(placeId);
  return windowBand(asked.start < asked.end ? asked : mealWindow(input.date, input.meal), now, (from, until) => ({
    lanes: lanesOf(naming, from, until),
    ...othersWithoutPlace(others, { from, until, label }),
    ...(skipped.length === 0 ? {} : { skipped: skippedOf(skipped, naming) }),
  }));
}

// A meeting's: the day's hours as the User narrowed them, or the day's own when that left none.
export function meetNoPlanBand(naming: GatheringNaming<GatheringArgs<MeetInput>>): TimeBand {
  const { input, now, others } = naming.args;
  const asked = meetWindow(input);
  const label = (placeId: string): string => naming.placeLabel(placeId);
  return windowBand(asked.start < asked.end ? asked : meetHours(input.date), now, (from, until) => ({
    lanes: lanesOf(naming, from, until),
    ...othersWithoutPlace(others, { from, until, label }),
  }));
}
