/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { z } from 'zod';
import { readCampusBoundary } from './common/campus-boundary.js';
import { METRES_PER_DEGREE, metresPerDegreeEast, type Position } from './common/geometry.js';
import { readSeedFile, SEED_DIRECTORY } from './common/seed-directory.js';
import { readSeedPlaces } from './places/places.seed.js';
import { readSeedStops } from './shuttle/shuttle.seed.js';
import { type Pin, walkingGraph, type WalkingGraph, walkingSeconds } from './travel/walking-graph.js';
import { WALKING_TABLE_FILE, type WalkingTable } from './travel/walking-table.js';

// The command that writes `seed/walking-table.json` from the Places, the Shuttle Stops, the pinned OpenStreetMap
// extract and the saved SRTM raster: `pnpm walking:build`. With `--sensitivity` it writes nothing, and prints how far
// the table moves when every pin moves.

const pathsFileSchema = z.object({
  timestamp: z.string(),
  copyright: z.string(),
  ways: z.array(
    z.object({
      nodes: z.array(z.number()),
      geometry: z.array(z.object({ lat: z.number(), lon: z.number() })),
      tags: z.record(z.string(), z.string()),
    }),
  ),
});

// One height per whole arcsecond, row by latitude and column by longitude, each from the first of its range.
const srtmFileSchema = z.object({
  exportedFrom: z.string(),
  latitudeArcseconds: z.tuple([z.number(), z.number()]),
  longitudeArcseconds: z.tuple([z.number(), z.number()]),
  metres: z.array(z.array(z.number())),
});

type Srtm = z.output<typeof srtmFileSchema>;

const SHIFTS_METRES = [10, 20];
const RUNS_PER_SHIFT = 10;
const WITHIN_SECONDS = 120;
const FRAGILE_PLACES_SHOWN = 15;
// Any fixed seed: it makes a report repeatable.
const SEED = 20_261_031;

// Bilinear between the raster's four nearest values, to the decimetre.
function elevationAt(
  { latitudeArcseconds, longitudeArcseconds, metres }: Srtm,
  { latitude, longitude }: Position,
): number {
  const row = latitude * 3600 - latitudeArcseconds[0];
  const column = longitude * 3600 - longitudeArcseconds[0];
  const [south, west] = [Math.floor(row), Math.floor(column)];
  const [north, east] = [row - south, column - west];
  const height = (r: number, c: number): number => {
    const value = metres[r]?.[c];
    if (value === undefined) {
      throw new Error(`The SRTM file does not cover ${latitude}, ${longitude}`);
    }
    return value;
  };
  const elevation =
    height(south, west) * (1 - north) * (1 - east) +
    height(south + 1, west) * north * (1 - east) +
    height(south, west + 1) * (1 - north) * east +
    height(south + 1, west + 1) * north * east;
  return Math.round(elevation * 10) / 10;
}

function randomSource(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

// The cells of a whole matrix that the table holds: all of them but a pin to itself and a Shuttle Stop to a Shuttle
// Stop. The Places come first among the pins.
function* tableCells(pins: number, places: number): Generator<[from: number, to: number]> {
  for (let from = 0; from < pins; from += 1) {
    for (let to = 0; to < pins; to += 1) {
      if (from !== to && (from < places || to < places)) {
        yield [from, to];
      }
    }
  }
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movedPin(srtm: Srtm, { latitude, longitude }: Pin, metres: number, random: () => number): Pin {
  const angle = random() * 2 * Math.PI;
  const moved = {
    latitude: latitude + (metres * Math.sin(angle)) / METRES_PER_DEGREE,
    longitude: longitude + (metres * Math.cos(angle)) / metresPerDegreeEast(latitude),
  };
  return { ...moved, elevation: elevationAt(srtm, moved) };
}

interface Built {
  graph: WalkingGraph;
  srtm: Srtm;
  pins: readonly Pin[];
  names: readonly string[];
  seconds: readonly number[][];
}

function printShift({ graph, srtm, pins, names, seconds }: Built, metres: number, random: () => number): void {
  const changes: number[] = [];
  const changesOfPlace = names.map((): number[] => []);
  for (let run = 0; run < RUNS_PER_SHIFT; run += 1) {
    const moved = pins.map((pin) => movedPin(srtm, pin, metres, random));
    const rebuilt = walkingSeconds(graph, moved, moved);
    for (const [from, to] of tableCells(pins.length, names.length)) {
      const change = Math.abs((rebuilt[from]?.[to] ?? 0) - (seconds[from]?.[to] ?? 0));
      changes.push(change);
      changesOfPlace[from]?.push(change);
      changesOfPlace[to]?.push(change);
    }
  }
  const within = changes.filter((change) => change <= WITHIN_SECONDS).length / changes.length;
  console.log(
    `${metres} m, ${RUNS_PER_SHIFT} runs: mean change ${mean(changes).toFixed(1)} s, ` +
      `${(within * 100).toFixed(1)}% of pairs within ±2 minutes`,
  );
  const fragile = names
    .map((name, place) => ({ name, change: mean(changesOfPlace[place] ?? []) }))
    .toSorted((a, b) => b.change - a.change)
    .slice(0, FRAGILE_PLACES_SHOWN);
  for (const { name, change } of fragile) {
    console.log(`  ${change.toFixed(1)} s  ${name}`);
  }
}

async function buildWalkingTable(): Promise<void> {
  const places = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
  const stops = await readSeedStops(SEED_DIRECTORY);
  const paths = await readSeedFile(SEED_DIRECTORY, 'openstreetmap-paths.json', pathsFileSchema);
  const srtm = await readSeedFile(SEED_DIRECTORY, 'srtm-elevation.json', srtmFileSchema);
  const graph = walkingGraph(paths.ways);
  const pins = [...places, ...stops].map(({ latitude, longitude }) => ({
    latitude,
    longitude,
    elevation: elevationAt(srtm, { latitude, longitude }),
  }));
  const seconds = walkingSeconds(graph, pins, pins);
  const unreachable = seconds.flat().filter((value) => value === Number.POSITIVE_INFINITY).length;
  if (unreachable > 0) {
    throw new Error(`${unreachable} pairs have no walk`);
  }
  if (process.argv.includes('--sensitivity')) {
    const random = randomSource(SEED);
    const names = places.map(({ number, name }) => (number === null ? name : `${number} ${name}`));
    for (const metres of SHIFTS_METRES) {
      printShift({ graph, srtm, pins, names, seconds }, metres, random);
    }
    return;
  }
  const whole = seconds.map((row) => row.map((value) => Math.round(value)));
  const table: WalkingTable = {
    builtFrom: `OpenStreetMap as of ${paths.timestamp}, and ${srtm.exportedFrom}`,
    copyright: paths.copyright,
    places: places.map(({ id, name }, index) => ({ id, name, elevation: pins[index]?.elevation ?? 0 })),
    stops: stops.map(({ name }, index) => ({ name, elevation: pins[places.length + index]?.elevation ?? 0 })),
    placeToPlace: whole.slice(0, places.length).map((row) => row.slice(0, places.length)),
    placeToStop: whole.slice(0, places.length).map((row) => row.slice(places.length)),
    stopToPlace: whole.slice(places.length).map((row) => row.slice(0, places.length)),
  };
  const file = join(SEED_DIRECTORY, WALKING_TABLE_FILE);
  await writeFile(file, await format(JSON.stringify(table), { ...(await resolveConfig(file)), filepath: file }));
  console.log(`Wrote ${file}: ${places.length} Places and ${stops.length} Shuttle Stops`);
}
await buildWalkingTable();
