/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';

export const WALKING_TABLE_FILE = 'walking-table.json';

const seconds = z.array(z.array(z.int().nonnegative()));

// What `pnpm walking:build` writes. The rows of `places` and of `stops` are in the order of these two lists, and
// `stops` is in loop order, so a stop's index is its `loop_order`.
export const walkingTableSchema = z.strictObject({
  builtFrom: z.string(),
  copyright: z.string(),
  places: z.array(z.strictObject({ id: z.uuid(), name: z.string(), elevation: z.number() })),
  stops: z.array(z.strictObject({ name: z.string(), elevation: z.number() })),
  placeToPlace: seconds,
  placeToStop: seconds,
  stopToPlace: seconds,
});

export type WalkingTable = z.output<typeof walkingTableSchema>;
