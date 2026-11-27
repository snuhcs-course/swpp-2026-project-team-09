/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Plan, PlanInput } from '@/api/assistant-types';
import type { OtherLane, TimeBand } from '@/api/time-band-types';
import { koreaClock } from '@/korea-time';
import { pickedLanes, pickedOf } from './people-picking';
import { windowOf } from './plan-input';

// What the time card is drawn from (P01 ticket 31): the Plan on screen, or for an answer with no Plan the frame it was
// asked in, so that nothing set by hand is lost to a recalculation that finds no Plan. Its place is the Plan's, for
// the Friends' walks while picking; a frame with no Plan behind it has none.
export interface Frame {
  band: TimeBand;
  parts: Plan['parts'];
  place: Plan['place'] | null;
}

// "HH:MM" on the band's day, as the band writes its times.
function onBandDay(band: TimeBand, clock: string): string {
  return `${band.startAt.slice(0, 11)}${clock}:00${band.startAt.slice(19)}`;
}

function at(iso: string, by: number): string {
  return new Date(new Date(iso).getTime() + by).toISOString();
}

// The window asked for over the band's: a bound set by hand stands, and an open one keeps the band's length.
function windowed(band: TimeBand, input: PlanInput): Pick<TimeBand, 'startAt' | 'endAt'> {
  const { from, until } = windowOf(input);
  const length = new Date(band.endAt).getTime() - new Date(band.startAt).getTime();
  if (from !== null && until !== null) {
    return { startAt: onBandDay(band, from), endAt: onBandDay(band, until) };
  }
  if (from !== null) {
    const startAt = onBandDay(band, from);
    return { startAt, endAt: at(startAt, length) };
  }
  if (until !== null) {
    const endAt = onBandDay(band, until);
    return { startAt: at(endAt, -length), endAt };
  }
  return { startAt: band.startAt, endAt: band.endAt };
}

// The Friends to add: the band's, and those of its lanes no longer asked for, but none asked for now.
function othersOf(band: TimeBand, asked: readonly string[]): OtherLane[] {
  const [, ...people] = band.lanes;
  const left: OtherLane[] = [];
  for (const lane of people) {
    if (!asked.includes(lane.userId)) {
      left.push({ userId: lane.userId, name: lane.name, busy: lane.busy, walkMinutes: null });
    }
  }
  const all = [...(band.others ?? []), ...left].filter(({ userId }) => !asked.includes(userId));
  return all.filter((other, index) => all.findIndex(({ userId }) => userId === other.userId) === index);
}

// A band of an earlier Plan redrawn for the conditions now: their people's lanes, the Classes still left out, and the
// window asked for, said as its start and end.
export function bandFor(band: TimeBand, input: PlanInput): TimeBand {
  const asked = pickedOf(input);
  const skipped = input.kind === 'meal' ? (input.skipped ?? []) : [];
  const { startAt, endAt } = windowed(band, input);
  return {
    ...band,
    lanes: pickedLanes(band, asked),
    others: othersOf(band, asked),
    ...(band.skipped === undefined ? {} : { skipped: band.skipped.filter(({ id }) => skipped.includes(id)) }),
    startAt,
    endAt,
    text: `${koreaClock(startAt)}–${koreaClock(endAt)}`,
  };
}

// The frame of an answer with no Plan: the band the main server sends with it, else the last Plan shown before it,
// redrawn for its conditions; null for an answer with a Plan, or with no band to draw.
export function frameOf(answer: AnswerReply | null, framed: Frame | null): Frame | null {
  if (answer === null || answer.plans.length > 0) {
    return null;
  }
  const given = answer.noPlan?.band;
  if (given !== undefined) {
    return { band: given, parts: framed?.parts ?? [], place: framed?.place ?? null };
  }
  return framed === null ? null : { ...framed, band: bandFor(framed.band, answer.input) };
}

// The frame a Plan leaves for an answer with no Plan after it.
export function frameOfPlan({ band, parts, place }: Plan): Frame {
  return { band, parts, place };
}
