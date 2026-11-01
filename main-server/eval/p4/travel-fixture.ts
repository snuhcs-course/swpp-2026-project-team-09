/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { type Travel, type TravelProvider } from '../../src/travel/travel.js';
import { type Seeded, seedOf } from '../world.ts';

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

// The fixture as the provider of `travel`, once it knows the world's Places by id.
export class FixtureTravel implements TravelProvider {
  private ways = new Map<string, Travel>();

  // Puts the fixture's Places, which it names by seed, under the ids of the world seeded.
  bind(seeds: Readonly<Record<string, Seeded>>): void {
    const idOf = (name: string): string => seedOf(seeds, 'place', name).id;
    this.ways = new Map(
      travelFixture().map(({ from, to, seconds, mode }) => [`${idOf(from)} ${idOf(to)}`, { seconds, mode }]),
    );
  }

  travel(fromPlaceId: string, toPlaceId: string): Travel {
    const way = this.ways.get(`${fromPlaceId} ${toPlaceId}`);
    if (way === undefined) {
      throw new Error(`The travel fixture has no way from ${fromPlaceId} to ${toPlaceId}`);
    }
    return way;
  }

  // The labels take one way for each pair, and leave-by times are worked from it.
  walkingSeconds(fromPlaceId: string, toPlaceId: string): number {
    return this.travel(fromPlaceId, toPlaceId).seconds;
  }
}
