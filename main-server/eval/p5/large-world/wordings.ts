/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { type LargeWorldData } from './world-data.ts';

// What eval/p5/large-world/wordings.yaml holds, and the positions of its Places (P05 ticket 02b).

export const hoursSchema = z.enum(['day', 'evening', 'morning', 'late', 'any']);

const titlesSchema = { titles: z.array(z.string()).min(1), typos: z.array(z.string()).default([]) };

const activitySchema = z.strictObject({
  name: z.string(),
  umbrella: z.string().optional(),
  board: z.enum(['meal', 'career', 'hobby', 'show']),
  hours: hoursSchema,
  weight: z.int().min(0),
  quest: z.strictObject(titlesSchema),
  event: z
    .strictObject({
      ...titlesSchema,
      descriptions: z.array(z.string()).min(1),
      // How many days it runs, the least and the most, when it runs for days.
      days: z.tuple([z.int().min(2), z.int().min(2)]).optional(),
    })
    .optional(),
});

export const wordingsSchema = z.strictObject({
  hosts: z.array(z.string()).min(1),
  questDescriptions: z.array(z.string()).min(1),
  activities: z.record(z.string(), activitySchema),
  places: z.record(z.string(), z.string()),
  points: z.array(z.strictObject({ label: z.string(), latitude: z.number(), longitude: z.number() })),
  placeWords: z.array(z.string()).min(1),
  people: z.array(z.strictObject({ name: z.string(), department: z.string() })).min(8),
});

export type Wordings = z.infer<typeof wordingsSchema>;

export function readWordings(): Wordings {
  return wordingsSchema.parse(parse(readFileSync(new URL('wordings.yaml', import.meta.url), 'utf8')));
}

export type PlacePositions = LargeWorldData['places'];

// The Places' positions as the shared seed's campus map gives them.
export function positionsFromSeed(wordings: Wordings, campusMap: unknown): PlacePositions {
  const { rows } = z
    .object({
      rows: z.array(
        z.object({
          inst_kor_nm: z.string(),
          vil_dong_nm: z.string().nullable(),
          lat_val: z.coerce.number(),
          lon_val: z.coerce.number(),
        }),
      ),
    })
    .parse(campusMap);
  return Object.fromEntries(
    Object.entries(wordings.places).map(([name, number]) => {
      const row = rows.find(({ inst_kor_nm: named, vil_dong_nm: at }) => named === name && at === number);
      if (row === undefined) {
        throw new Error(`The campus map has no ${name} (${number})`);
      }
      return [name, { number, latitude: row.lat_val, longitude: row.lon_val }];
    }),
  );
}
