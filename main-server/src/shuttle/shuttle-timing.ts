/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';

// The shuttle's times: the shape of shuttle-timing.json and the values that stand in for what it lacks. `travel` and
// the shuttle tools both read this file, so that the score's baseline is the fallback the app really uses.

export const SHUTTLE_BANDS = ['08-11', '11-14', '14-17', '17-19', '19-21'] as const;

export type ShuttleBand = (typeof SHUTTLE_BANDS)[number];

const bandSeconds = z.partialRecord(z.enum(SHUTTLE_BANDS), z.number().nonnegative());

// Stops are keyed by their place on the loop (`loop_order`), which outlives a database. All times are seconds.
export const shuttleTimingSchema = z.strictObject({
  // The days it was derived from, YYYY-MM-DD.
  days: z.array(z.iso.date()),
  // Per stop and band, the average wait.
  waits: z.record(z.string(), bandSeconds),
  // Per boarding stop, alighting stop and band, the median ride.
  rides: z.record(z.string(), z.record(z.string(), bandSeconds)),
});

export type ShuttleTiming = z.output<typeof shuttleTimingSchema>;

// The length of the loop's segment from each stop to the next, in loop order from 정문.
export const SEGMENT_METRES = [333, 274, 357, 253, 161, 1096, 290, 346, 230, 590, 496, 236, 221, 341] as const;

export const SHUTTLE_STOP_COUNT = SEGMENT_METRES.length;

const BASELINE_SPEED = 4.15;

// The band of an hour of the day in Korea, or null outside the service hours.
export function bandAt(hour: number): ShuttleBand | null {
  return SHUTTLE_BANDS.find((band) => hour >= Number(band.slice(0, 2)) && hour < Number(band.slice(3))) ?? null;
}

// The distance along the loop, which runs one way, from one stop to another.
export function alongLoopMetres(from: number, to: number): number {
  const stops = (to - from + SHUTTLE_STOP_COUNT) % SHUTTLE_STOP_COUNT;
  return Array.from({ length: stops }, (_, step) => (from + step) % SHUTTLE_STOP_COUNT).reduce(
    (metres, stop) => metres + (SEGMENT_METRES[stop] ?? 0),
    0,
  );
}

// The wait when the file has none for that stop and band.
export function fallbackWaitSeconds(band: ShuttleBand): number {
  return band === '19-21' ? 600 : 210;
}

// The ride when the file has none for that pair of stops and band.
export function fallbackRideSeconds(from: number, to: number): number {
  return alongLoopMetres(from, to) / BASELINE_SPEED;
}
