/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { existsSync, readFileSync } from 'node:fs';
import { parseArgs, parseEnv } from 'node:util';
import { z } from 'zod';
import { koreaDate } from '../src/assistant/korea-time.ts';
import { MODEL_CACHE_MODES, MODEL_PROVIDERS, MODEL_SETTINGS, settingsSchema } from '../src/common/settings.ts';
import { WORLDS } from './cases.ts';
import { pricesSchema } from './cost.ts';

// The options of a run (spec P19, "Where it lives and how it runs"): the model and its hyperparameters from the
// command line, each left out taking the value of the branch's settings, which main-server/.env gives or else the
// settings' defaults in src/common/settings.ts. `pnpm eval` resolves them and hands them to the Vitest project as
// JSON in EVAL_RUN; the run records them.

export const RUN_ENV = 'EVAL_RUN';

export const runOptionsSchema = z.strictObject({
  // Who the model is called through, MODEL_PROVIDER or --provider, and what its requests cache, MODEL_CACHE or --cache
  // (spec A01). Absent in a run saved before A01, which went through OpenRouter with nothing cached.
  provider: z.enum(MODEL_PROVIDERS).optional(),
  cache: z.enum(MODEL_CACHE_MODES).optional(),
  // The provider's id of the model: claude-haiku-5-5 for Anthropic, anthropic/claude-haiku-5.5 for OpenRouter.
  model: z.string().min(1),
  // Sampling, applied by the recorder's model wrapper; null leaves the provider's default. The Anthropic path takes
  // none: its API refuses them for the models we use.
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
  // Runs the world's holdout in place of its cases. Only the P4 suite has one.
  holdout: z.literal(true).optional(),
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

// The provider, its caching mode and its model, from the flags or else the settings. OpenRouter's requests carry no
// cache_control, so they cache nothing; the chosen provider's model setting is empty when neither gives one, which the
// schema refuses.
function pathOf(
  values: { provider?: string; cache?: string; model?: string },
  env: Record<string, string | undefined>,
): Pick<RunOptions, 'provider' | 'cache' | 'model'> {
  const { shape } = settingsSchema;
  const provider = shape.MODEL_PROVIDER.parse(values.provider ?? env.MODEL_PROVIDER);
  if (provider === 'openrouter' && (values.cache ?? 'off') !== 'off') {
    throw new Error('--cache is for --provider anthropic: the OpenRouter requests cache nothing');
  }
  const { model } = MODEL_SETTINGS[provider];
  return {
    provider,
    cache: provider === 'anthropic' ? shape.MODEL_CACHE.parse(values.cache ?? env.MODEL_CACHE) : 'off',
    model: values.model ?? shape[model].parse(env[model]),
  };
}

// Reads the command line against the branch's settings in `env`.
export function parseFlags(argv: string[], env: Record<string, string | undefined>): Flags {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      provider: { type: 'string' },
      cache: { type: 'string' },
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
      holdout: { type: 'boolean', default: false },
      yes: { type: 'boolean', default: false },
    },
  });
  const { shape } = settingsSchema;
  const options = runOptionsSchema.omit({ prices: true, commit: true }).parse({
    ...pathOf(values, env),
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
    ...(values.holdout ? { holdout: true } : {}),
  });
  if (options.provider === 'anthropic' && (options.temperature !== null || options.topP !== null)) {
    throw new Error('--temperature and --top-p are for --provider openrouter: the Anthropic API refuses them');
  }
  if (options.holdout === true && options.world !== 'p4') {
    throw new Error(`--holdout runs the P4 suite's, and ${options.world} has none`);
  }
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

// What names a run's settings in its file name: s8-t30000-o1000-temp1-topp0.9, with "default" for sampling left out,
// and -cachebreakpoints for the caching mode of a run that has one.
export function settingsSlug({ maxSteps, timeoutMs, maxOutputTokens, temperature, topP, cache }: RunOptions): string {
  const slug = `s${maxSteps}-t${timeoutMs}-o${maxOutputTokens}-temp${temperature ?? 'default'}-topp${topP ?? 'default'}`;
  return cache === undefined ? slug : `${slug}-cache${cache}`;
}

// The name of a run's file: <YYYY-MM-DD>-<commit>-<provider>-<model>-<settings>, the day in Korea, the model's slash
// replaced, the provider left out for a run that has none, and -holdout on a run of the holdout, so that it is not
// taken for the official run of that commit.
export function runName(options: RunOptions, startedAt: Date): string {
  const model = options.model.replaceAll(/[^\w.-]/gu, '_');
  const path = options.provider === undefined ? model : `${options.provider}-${model}`;
  const name = `${koreaDate(startedAt)}-${options.commit}-${path}-${settingsSlug(options)}`;
  return options.holdout === true ? `${name}-holdout` : name;
}
