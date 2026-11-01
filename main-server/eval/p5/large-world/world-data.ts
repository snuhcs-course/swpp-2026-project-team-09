/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

// The shape of a large world's data file (P05 ticket 02b), which holds its Quests and Global Events by their attributes,
// and what reads it. The file is never changed: a change to the schema is met in eval/p5/large-world/world.ts, which
// stores the file's values as the schema wants them. A change to the file is a new version.

// The large worlds there are. A world's name holds its version, and a run records it, so scores of two versions are
// never read as one world's.
export const LARGE_WORLD = 'large-world-v1';

const profileSchema = z.strictObject({ name: z.string(), department: z.string() });

const positionFields = { latitude: z.number(), longitude: z.number() };

// A Place of the shared seed, a point on the map, or words alone. A Quest with none of them has words only as well.
const questPlaceSchema = z.union([
  z.strictObject({ seed: z.string() }),
  z.strictObject({ label: z.string(), ...positionFields }),
  z.strictObject({ label: z.string() }),
]);

const questFields = {
  // Its seed name: titles repeat, as a Board's do.
  key: z.string(),
  title: z.string(),
  description: z.string().max(200),
  activity: z.string(),
  capacity: z.int().min(1).max(8),
  holders: z.int().min(1).max(8),
  // Whether it started before the world's clock. It holds for a Quest for a Global Event too: its event is under way.
  started: z.boolean(),
  // The asker holds it, as one of its Holders, or asked to join it and is waiting.
  asker: z.enum(['none', 'holds', 'asked']),
  // A trap by hand, with what it is there to catch. Otherwise generated.
  trap: z.string().optional(),
};

const recruitingFields = {
  joinPolicy: z.enum(['open', 'approval']),
  board: z.enum(['meal', 'career', 'hobby', 'show']),
};

const closedFields = { joinPolicy: z.literal('closed'), board: z.null() };

const timedFields = { starts: z.string(), ends: z.string(), place: questPlaceSchema.nullable() };

const forEventFields = { globalEvent: z.string() };

export const questSchema = z.union([
  z.strictObject({ ...questFields, ...recruitingFields, ...timedFields }),
  z.strictObject({ ...questFields, ...closedFields, ...timedFields }),
  z.strictObject({ ...questFields, ...recruitingFields, ...forEventFields }),
  z.strictObject({ ...questFields, ...closedFields, ...forEventFields }),
]);

const globalEventSchema = z.strictObject({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  activity: z.string(),
  starts: z.string(),
  // Null when no end is known: it lasts until the end of its start's day.
  ends: z.string().nullable(),
  place: z.string(),
  ...positionFields,
  trap: z.string().optional(),
});

export const largeWorldSchema = z.strictObject({
  version: z.string(),
  // The generator's random seed and the clock the world was made for.
  randomSeed: z.int(),
  now: z.string(),
  asker: profileSchema,
  people: z.array(profileSchema).min(8),
  // The Places it uses by seed name, as the shared seed places them.
  places: z.record(z.string(), z.strictObject({ number: z.string(), ...positionFields })),
  globalEvents: z.array(globalEventSchema),
  quests: z.array(questSchema),
});

export type LargeWorldData = z.infer<typeof largeWorldSchema>;
export type LargeQuest = z.infer<typeof questSchema>;
export type LargeGlobalEvent = z.infer<typeof globalEventSchema>;
export type QuestPlace = z.infer<typeof questPlaceSchema>;

export const directoryOf = (version: string): URL => new URL(`../${version}/`, import.meta.url);

export const sha256Of = (file: URL): string => createHash('sha256').update(readFileSync(file)).digest('hex');

// A call that a model reading a case rightly would make, with seed names where the tool takes ids.
const intendedCallSchema = z.strictObject({
  tool: z.enum(['searchRecruitingQuests', 'searchGlobalEvents']),
  input: z.record(z.string(), z.unknown()),
});

// A case's intended calls, for the test of server recall, and what its server recall is waiting for: null when it holds
// already. A ticket that makes it hold takes the mark away here; neither is the world's data or an answer.
const intendedSchema = z.array(
  z.strictObject({
    case: z.string(),
    until: z.union([z.null(), z.literal(10), z.literal(11), z.literal('search stage 1')]),
    calls: z.array(intendedCallSchema).min(1),
  }),
);

export type Intended = z.infer<typeof intendedSchema>[number];

export function intendedCalls(version: string = LARGE_WORLD): Intended[] {
  return intendedSchema.parse(parse(readFileSync(new URL('intended.yaml', directoryOf(version)), 'utf8')));
}

// The data file of a version.
export function largeWorldData(version: string = LARGE_WORLD): LargeWorldData {
  return largeWorldSchema.parse(JSON.parse(readFileSync(new URL('world.json', directoryOf(version)), 'utf8')));
}
