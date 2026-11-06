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
import {
  FROZEN_CLIMB_SECONDS_PER_METRE,
  FROZEN_METRES_PER_SECOND,
  fitSpeedAndClimb,
  recoveredInput,
} from './walking/fit.ts';
import { scoreWalks, TELLING_PAIRS } from './walking/score.ts';

// `pnpm walking:score [table]`: a walking table, the committed one unless another is named, against the 30 test walks,
// and the calibration fit over the 13 calibration walks. See README.md, "Seed data".

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
type Walk = z.output<typeof walkSchema>;

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

function walked(pairs: readonly Pair[], walks: readonly Walk[]): { pair: Pair; walk: Walk }[] {
  if (walks.length !== pairs.length) {
    throw new Error(`${walks.length} walks for ${pairs.length} pairs`);
  }
  return pairs.map((pair) => {
    const walk = walks.find((candidate) => candidate.pair === pair.pair);
    if (walk === undefined) {
      throw new Error(`Pair ${pair.pair} has no walk`);
    }
    return { pair, walk };
  });
}

function elevationOf(table: WalkingTable, placeId: string): number {
  const place = table.places.find(({ id }) => id === placeId);
  if (place === undefined) {
    throw new Error(`The walking table lacks the Place ${placeId}`);
  }
  return place.elevation;
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

function inputRow(pair: string, walkedSeconds: string, metres: string, climb: string): string {
  return `  ${pair.padEnd(6)}${walkedSeconds.padStart(12)}${metres.padStart(10)}${climb.padStart(11)}`;
}

function verdict(met: boolean): string {
  return met ? 'met' : 'missed';
}

function printScore(file: string, table: WalkingTable, testWalks: { pair: Pair; walk: Walk }[]): void {
  const scoredWalks = testWalks.map(({ pair, walk }) => ({
    pair: pair.pair,
    walked: walk.walkedSeconds,
    table: tableSeconds(table, pair),
    baseline: pair.baselineSeconds,
  }));
  const atFreeze = testWalks.filter(({ pair }, index) => scoredWalks[index]?.table === pair.tableSeconds).length;
  const { table: scored, baseline, k, verdicts } = scoreWalks(scoredWalks);
  const count = scoredWalks.length;

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

// The elevations are the committed table's, which the build takes from the seed and not from its two constants.
function printFit(committed: WalkingTable, calibrationWalks: { pair: Pair; walk: Walk }[]): void {
  const inputs = calibrationWalks.map(({ pair, walk }) => ({
    pair: pair.pair,
    walked: walk.walkedSeconds,
    ...recoveredInput({
      tableSeconds: pair.tableSeconds,
      fromElevation: elevationOf(committed, pair.fromPlaceId),
      toElevation: elevationOf(committed, pair.toPlaceId),
    }),
  }));
  const fit = fitSpeedAndClimb(inputs);

  console.log(
    `Calibration fit over the ${inputs.length} calibration pairs, by ordinary least squares, no constant term:`,
  );
  console.log('  seconds = metres / speed + climb × climb seconds per metre');
  console.log(
    "Metres and climbs recovered from the table's seconds at the freeze, at " +
      `${FROZEN_METRES_PER_SECOND} m/s and ${FROZEN_CLIMB_SECONDS_PER_METRE} s per metre of climb:`,
  );
  console.log(inputRow('Pair', 'Walked (s)', 'Metres', 'Climb (m)'));
  for (const { pair, walked: walkedSeconds, metres, climb } of inputs) {
    console.log(inputRow(pair, String(walkedSeconds), metres.toFixed(2), climb.toFixed(1)));
  }
  console.log(`Speed: ${fit.metresPerSecond} m/s`);
  console.log(
    `Climb: ${fit.fittedClimbSecondsPerMetre} s per metre` +
      (fit.climbSecondsPerMetre === fit.fittedClimbSecondsPerMetre
        ? ''
        : `, below 0, so ${fit.climbSecondsPerMetre} with the same speed`),
  );
}

function main([named]: string[]): void {
  const committedFile = join(SEED_DIRECTORY, WALKING_TABLE_FILE);
  const file = named === undefined ? committedFile : resolve(named);
  const pairs = readJson(new URL('pairs.json', WALKING_DATA), pairsFileSchema);
  const walks = readJson(new URL('walks.json', WALKING_DATA), walksFileSchema);
  printScore(file, readJson(file, walkingTableSchema), walked(pairs.test, walks.test));
  console.log();
  printFit(readJson(committedFile, walkingTableSchema), walked(pairs.calibration, walks.calibration));
}

main(process.argv.slice(2));
