/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { parseArgs } from 'node:util';
import { z } from 'zod';
import { pricesSchema } from '../cost.ts';

// The flags of `pnpm eval:collection`, handed to the run's Vitest project as JSON. A run reads held-out posts only when
// its command says so.

export const COLLECTION_RUN_ENV = 'EVAL_COLLECTION_RUN';

const RUN_NAMES = ['r0a', 'judgement', 'r0b', 'title-rule', 'ai-choice'] as const;

export const collectionOptionsSchema = z.strictObject({
  run: z.enum(RUN_NAMES),
  part: z.enum(['development', 'held-out']),
  // The saved run whose answers this one reads instead of asking.
  from: z.string().nullable(),
  // Scores again, or replays, with no model: an answer no saved run gives stops it.
  noModel: z.boolean(),
  model: z.string().min(1),
  budgetUsd: z.number().positive(),
  timeoutMs: z.int().positive(),
  maxOutputTokens: z.int().positive(),
  // Set by the command line.
  allowDirty: z.boolean(),
  command: z.string(),
  commit: z.string(),
  isDirty: z.boolean(),
  c0Tag: z.string(),
  isDescendantOfC0: z.boolean(),
  setHash: z.string(),
  thresholdsBlob: z.string(),
  canonicalSlug: z.string().nullable(),
  prices: pricesSchema,
});

export type CollectionOptions = z.infer<typeof collectionOptionsSchema>;

export type CollectionFlags = Pick<CollectionOptions, 'run' | 'part' | 'from' | 'noModel' | 'budgetUsd' | 'allowDirty'>;

const flagsSchema = z.object({
  run: z.enum(RUN_NAMES),
  part: z.enum(['development', 'held-out']).default('development'),
  from: z.string().min(1).nullable().default(null),
  noModel: z.boolean().default(false),
  budget: z.coerce.number().positive().default(1),
  allowDirty: z.boolean().default(false),
});

// Which runs must read a saved run's answers: evaluation B's, for the reading.
const NEEDS_SAVED = new Set<string>(['r0b', 'title-rule', 'ai-choice']);

export function parseCollectionFlags(args: string[]): CollectionFlags {
  const { values } = parseArgs({
    args,
    options: {
      run: { type: 'string' },
      part: { type: 'string' },
      from: { type: 'string' },
      'no-model': { type: 'boolean' },
      budget: { type: 'string' },
      'allow-dirty': { type: 'boolean' },
    },
    strict: true,
  });
  const flags = flagsSchema.parse({
    run: values.run,
    part: values.part,
    from: values.from,
    noModel: values['no-model'],
    budget: values.budget,
    allowDirty: values['allow-dirty'],
  });
  if (NEEDS_SAVED.has(flags.run) && flags.from === null) {
    throw new Error(`--run ${flags.run} reads a saved Judgement: give --from <run.json>`);
  }
  return {
    run: flags.run,
    part: flags.part,
    from: flags.from,
    noModel: flags.noModel,
    budgetUsd: flags.budget,
    allowDirty: flags.allowDirty,
  };
}

// Only these two runs may ask, and only what a saved run does not give.
export function mayCallModel({ run, noModel }: Pick<CollectionOptions, 'run' | 'noModel'>): boolean {
  return !noModel && (run === 'judgement' || run === 'ai-choice');
}
