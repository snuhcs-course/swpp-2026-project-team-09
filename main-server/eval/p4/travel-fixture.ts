/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';

// The frozen travel fixture (spec P04, "Evaluation plan" 1): for every ordered pair of the P4 world's Places by seed
// name, the seconds and the mode, whatever the time of day. Bound in the place of the real Travel Times, so that the
// labels do not change when the walking table or the shuttle file does.

const fixtureSchema = z.strictObject({
  note: z.string(),
  rows: z.array(
    z.strictObject({
      from: z.string(),
      to: z.string(),
      seconds: z.int().min(0),
      mode: z.enum(['walk', 'shuttle']),
    }),
  ),
});

export type TravelRow = z.infer<typeof fixtureSchema>['rows'][number];

export function travelFixture(): TravelRow[] {
  const file = new URL('travel-fixture.json', import.meta.url);
  return fixtureSchema.parse(JSON.parse(readFileSync(file, 'utf8'))).rows;
}
