/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { existsSync, readFileSync } from 'node:fs';
import { parseArgs, parseEnv } from 'node:util';
import { z } from 'zod';
import { koreaDate } from '../src/assistant/korea-time.ts';
import { settingsSchema } from '../src/common/settings.ts';
import { WORLDS } from './cases.ts';
import { pricesSchema } from './cost.ts';

// The options of a run (spec P19, "Where it lives and how it runs"): the model and its hyperparameters from the
// command line, each left out taking the value of the branch's settings, which main-server/.env gives or else the
// settings' defaults in src/common/settings.ts. `pnpm eval` resolves them and hands them to the Vitest project as
// JSON in EVAL_RUN; the run records them.

export const RUN_ENV = 'EVAL_RUN';

export const runOptionsSchema = z.strictObject({
  // The OpenRouter id of the model, such as anthropic/claude-haiku-5.5.
  model: z.string().min(1),
  // Sampling, applied by the recorder's model wrapper; null leaves the provider's default.
  temperature: z.number().min(0).max(2).nullable(),
  topP: z.number().gt(0).max(1).nullable(),
  // The limits per message, given to the app as its settings.
  maxSteps: z.int().min(1),
  timeoutMs: z.int().min(1),
  maxOutputTokens: z.int().min(1),
  // How many times the repeated set runs; null for each case's own count.
  repeat: z.int().min(1).nullable(),
  categories: z.array(z.string()),
  caseIds: z.array(z.string()),
  // The run stops once its estimated cost passes this, in USD.
  budgetUsd: z.number().positive(),
  // The world the run seeds, and whose cases it runs.
  world: z.enum(WORLDS),
  prices: pricesSchema,
  // The commit measured, and whether files were changed on top of it.
  commit: z.string().min(1),
});

export type RunOptions = z.infer<typeof runOptionsSchema>;

// main-server/.env as text values, or none when there is no file. Its key is read from here and never printed.
export function dotEnv(): Record<string, string | undefined> {
  const file = new URL('../.env', import.meta.url);
  return existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
}

const DEFAULT_BUDGET_USD = 5;

// A number flag's value, or undefined when it is left out.
function number(name: string, text: string | undefined): number | undefined {
  if (text === undefined) {
    return undefined;
  }
  const value = Number(text);
  if (text.trim() === '' || !Number.isFinite(value)) {
    throw new Error(`--${name} takes a number, not ${text}`);
  }
  return value;
}

// The values given in a comma-separated or repeated flag.
function listOf(values: string[] | undefined): string[] {
  return (values ?? [])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value !== '');
}

export interface Flags {
  options: Omit<RunOptions, 'prices' | 'commit'>;
  // Run without asking first.
  yes: boolean;
}

// Reads the command line against the branch's settings in `env`.
export function parseFlags(argv: string[], env: Record<string, string | undefined>): Flags {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      model: { type: 'string' },
      temperature: { type: 'string' },
      'top-p': { type: 'string' },
      'max-steps': { type: 'string' },
      timeout: { type: 'string' },
      'max-output-tokens': { type: 'string' },
      repeat: { type: 'string' },
      category: { type: 'string', multiple: true },
      case: { type: 'string', multiple: true },
      budget: { type: 'string' },
      world: { type: 'string' },
      yes: { type: 'boolean', default: false },
    },
  });
  const { shape } = settingsSchema;
  const options = runOptionsSchema.omit({ prices: true, commit: true }).parse({
    // Empty when neither gives one, which the schema refuses.
    model: values.model ?? shape.ASSISTANT_MODEL.parse(env.ASSISTANT_MODEL),
    temperature: number('temperature', values.temperature) ?? null,
    topP: number('top-p', values['top-p']) ?? null,
    maxSteps: number('max-steps', values['max-steps']) ?? shape.ASSISTANT_MAX_STEPS.parse(env.ASSISTANT_MAX_STEPS),
    timeoutMs: number('timeout', values.timeout) ?? shape.ASSISTANT_TIMEOUT_MS.parse(env.ASSISTANT_TIMEOUT_MS),
    maxOutputTokens:
      number('max-output-tokens', values['max-output-tokens']) ??
      shape.ASSISTANT_MAX_OUTPUT_TOKENS.parse(env.ASSISTANT_MAX_OUTPUT_TOKENS),
    repeat: number('repeat', values.repeat) ?? null,
    categories: listOf(values.category),
    caseIds: listOf(values.case),
    budgetUsd: number('budget', values.budget) ?? DEFAULT_BUDGET_USD,
    world: values.world ?? 'small',
  });
  return { options, yes: values.yes };
}

// The options `pnpm eval` handed over.
export function runOptionsFromEnv(): RunOptions {
  const json = process.env[RUN_ENV];
  if (json === undefined) {
    throw new Error(`Start the benchmark with pnpm eval, which sets ${RUN_ENV}`);
  }
  return runOptionsSchema.parse(JSON.parse(json));
}

// What names a run's settings in its file name: s8-t30000-o1000-temp1-topp0.9, with "default" for sampling left out.
export function settingsSlug({ maxSteps, timeoutMs, maxOutputTokens, temperature, topP }: RunOptions): string {
  return `s${maxSteps}-t${timeoutMs}-o${maxOutputTokens}-temp${temperature ?? 'default'}-topp${topP ?? 'default'}`;
}

// The name of a run's file: <YYYY-MM-DD>-<commit>-<model>-<settings>, the day in Korea, the model's slash replaced.
export function runName(options: RunOptions, startedAt: Date): string {
  const model = options.model.replaceAll(/[^\w.-]/gu, '_');
  return `${koreaDate(startedAt)}-${options.commit}-${model}-${settingsSlug(options)}`;
}
