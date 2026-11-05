/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { z } from 'zod';
import { SEED_DIRECTORY } from '../src/common/seed-directory.ts';
import { WALKING_TABLE_FILE, type WalkingTable, walkingTableSchema } from '../src/travel/walking-table.ts';
import { scoreWalks, TELLING_PAIRS, type TestWalk } from './walking/score.ts';

// `pnpm walking:score [table]`: a walking table, the committed one unless another is named, against the 30 test walks.
// See README.md, "Seed data".

const WALKING_DATA = new URL('../eval/walking/', import.meta.url);

const pairSchema = z.strictObject({
  pair: z.string(),
  from: z.string(),
  to: z.string(),
  straightLineMetres: z.number(),
  tableSeconds: z.int(),
  baselineSeconds: z.int(),
  fromPlaceId: z.uuid(),
  toPlaceId: z.uuid(),
});

const pairsFileSchema = z.strictObject({
  source: z.string(),
  test: z.array(pairSchema.extend({ chain: z.enum(['A', 'B']) })),
  calibration: z.array(pairSchema),
});

const walkSchema = z.strictObject({
  pair: z.string(),
  walker: z.string(),
  date: z.iso.date(),
  started: z.string().regex(/^\d{2}:\d{2}$/u),
  walkedSeconds: z.int().positive(),
  secondsTakenOff: z.int().nonnegative(),
});

const walksFileSchema = z.strictObject({
  source: z.string(),
  test: z.array(walkSchema),
  calibration: z.array(walkSchema),
});

type Pair = z.output<typeof pairSchema>;

function readJson<T>(path: string | URL, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

function tableSeconds(table: WalkingTable, { pair, fromPlaceId, toPlaceId }: Pair): number {
  const from = table.places.findIndex(({ id }) => id === fromPlaceId);
  const to = table.places.findIndex(({ id }) => id === toPlaceId);
  const found = table.placeToPlace[from]?.[to];
  if (found === undefined) {
    throw new Error(`The walking table lacks pair ${pair}`);
  }
  return found;
}

function seconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

function share(pairs: readonly string[], of: number): string {
  return `${pairs.length} / ${of} (${((pairs.length / of) * 100).toFixed(1)}%)`;
}

function listed(pairs: readonly string[]): string {
  return pairs.length === 0 ? 'none' : pairs.join(', ');
}

function row(label: string, table: string, baseline: string): string {
  return `${label.padEnd(32)}${table.padEnd(20)}${baseline}`;
}

function verdict(met: boolean): string {
  return met ? 'met' : 'missed';
}

function main([named]: string[]): void {
  const file = named === undefined ? join(SEED_DIRECTORY, WALKING_TABLE_FILE) : resolve(named);
  const table = readJson(file, walkingTableSchema);
  const pairs = readJson(new URL('pairs.json', WALKING_DATA), pairsFileSchema).test;
  const walks = readJson(new URL('walks.json', WALKING_DATA), walksFileSchema).test;
  if (walks.length !== pairs.length) {
    throw new Error(`${walks.length} test walks for ${pairs.length} test pairs`);
  }
  const testWalks: TestWalk[] = pairs.map((pair) => {
    const walk = walks.find((candidate) => candidate.pair === pair.pair);
    if (walk === undefined) {
      throw new Error(`Pair ${pair.pair} has no walk`);
    }
    return {
      pair: pair.pair,
      walked: walk.walkedSeconds,
      table: tableSeconds(table, pair),
      baseline: pair.baselineSeconds,
    };
  });
  const atFreeze = pairs.filter((pair, index) => testWalks[index]?.table === pair.tableSeconds).length;
  const { table: scored, baseline, k, verdicts } = scoreWalks(testWalks);
  const count = testWalks.length;

  console.log(`Walking table: ${relative(process.cwd(), file)}`);
  console.log(`Equal to the table at the freeze on ${atFreeze} of ${count} test pairs`);
  console.log();
  console.log(row(`${count} test pairs`, 'Table', 'Baseline'));
  console.log(row('MAE', seconds(scored.mae), seconds(baseline.mae)));
  console.log(row('Within ±2 minutes', share(scored.withinTwoMinutes, count), share(baseline.withinTwoMinutes, count)));
  console.log(
    row('Within min(25%, 2 minutes)', share(scored.withinRevised, count), share(baseline.withinRevised, count)),
  );
  console.log(row('Late by more than 2 minutes', share(scored.late, count), share(baseline.late, count)));
  console.log(row('MAE over the 8 pairs', seconds(scored.tellingMae), seconds(baseline.tellingMae)));
  console.log();
  console.log(`The 8 pairs: ${TELLING_PAIRS.join(', ')}`);
  console.log(
    `Within min(25%, 2 minutes): the table's ${listed(scored.withinRevised)}; ` +
      `the baseline's ${listed(baseline.withinRevised)}`,
  );
  console.log(`Late: the table's ${listed(scored.late)}; the baseline's ${listed(baseline.late)}`);
  console.log(`k = ${k.toFixed(3)}`);
  console.log();
  console.log("Threshold: at least 70% within, and the MAE below the baseline's");
  console.log(`  under ±2 minutes: ${verdict(verdicts.twoMinutes)}`);
  console.log(`  under min(25%, 2 minutes): ${verdict(verdicts.revised)}`);
}

main(process.argv.slice(2));
