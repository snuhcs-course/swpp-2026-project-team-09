/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { WEEKDAYS } from '../../src/timetable-reading/labels.ts';
import { type FoundBlock } from '../../src/timetable-reading/timetable-reading.service.ts';

// The blocks the phone sends with a picture (`timedBlocks` in mobile/src/features/timetable-ocr/read-timetable.ts),
// saved per screenshot in blocks/<name>.json; the app's test timetable-ocr-sent-blocks.unit.test.ts holds them equal
// to what the phone computes. On P13's four from their saved ML Kit outputs; on the five of P15-52, which have none,
// from the PNG with only the day letters and hour labels stood in (stage 1). On the synthetic timetables, the blocks
// as drawn (synthetic/<name>.blocks.json).

export const foundBlockSchema = z.object({
  weekday: z.enum(WEEKDAYS),
  start: z.string(),
  end: z.string(),
  colour: z.tuple([z.number(), z.number(), z.number()]).nullable(),
  fades: z.boolean().optional(),
});

export function blocksOf(name: string): FoundBlock[] {
  const file = name.startsWith('synthetic-')
    ? new URL(`synthetic/${name}.blocks.json`, import.meta.url)
    : new URL(`blocks/${name}.json`, import.meta.url);
  return z.array(foundBlockSchema).parse(JSON.parse(readFileSync(file, 'utf8')));
}
