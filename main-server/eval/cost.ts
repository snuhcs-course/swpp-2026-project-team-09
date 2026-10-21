/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { z } from 'zod';

// What a run costs (spec P19, "Cost"), an estimate from OpenRouter's listed prices: before the run, from the number
// of turns and the tokens a turn took in the last run, and during it, from the tokens the model reported. The budget
// relies on it; a credit limit on the OpenRouter key is the hard stop, if the team wants one.

// USD per token.
export const pricesSchema = z.strictObject({
  input: z.number().min(0),
  output: z.number().min(0),
  cacheRead: z.number().min(0),
  cacheWrite: z.number().min(0),
  // Where the prices came from: OpenRouter's list, or the fallback when the model was not found in it.
  source: z.enum(['openrouter', 'fallback']),
});

export type Prices = z.infer<typeof pricesSchema>;

// Prices well above a small model's, for a model OpenRouter's list does not have: USD 5 and 25 per million tokens.
export const FALLBACK_PRICES: Prices = {
  input: 5e-6,
  output: 25e-6,
  cacheRead: 0.5e-6,
  cacheWrite: 6.25e-6,
  source: 'fallback',
};

const listedSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      pricing: z.object({
        prompt: z.coerce.number(),
        completion: z.coerce.number(),
        input_cache_read: z.coerce.number().optional(),
        input_cache_write: z.coerce.number().optional(),
      }),
    }),
  ),
});

// The model's prices from OpenRouter's public list of models, which needs no key, or the fallback.
export async function pricesOf(model: string, fetchList: typeof fetch = fetch): Promise<Prices> {
  try {
    const response = await fetchList('https://openrouter.ai/api/v1/models');
    const listed = listedSchema.parse(await response.json()).data.find(({ id }) => id === model);
    if (listed === undefined) {
      return FALLBACK_PRICES;
    }
    const { prompt, completion, input_cache_read: cacheRead, input_cache_write: cacheWrite } = listed.pricing;
    return {
      input: prompt,
      output: completion,
      cacheRead: cacheRead ?? prompt,
      cacheWrite: cacheWrite ?? prompt,
      source: 'openrouter',
    };
  } catch {
    return FALLBACK_PRICES;
  }
}

export interface Tokens {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export const NO_TOKENS: Tokens = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

export function addTokens(a: Tokens, b: Partial<Record<keyof Tokens, number | null>>): Tokens {
  return {
    inputTokens: a.inputTokens + (b.inputTokens ?? 0),
    outputTokens: a.outputTokens + (b.outputTokens ?? 0),
    cacheReadTokens: a.cacheReadTokens + (b.cacheReadTokens ?? 0),
    cacheWriteTokens: a.cacheWriteTokens + (b.cacheWriteTokens ?? 0),
  };
}

// The cost in USD. The input tokens include those read from and written to the cache, which have prices of their own.
export function costOf(tokens: Tokens, prices: Prices): number {
  const uncached = Math.max(0, tokens.inputTokens - tokens.cacheReadTokens - tokens.cacheWriteTokens);
  return (
    uncached * prices.input +
    tokens.cacheReadTokens * prices.cacheRead +
    tokens.cacheWriteTokens * prices.cacheWrite +
    tokens.outputTokens * prices.output
  );
}

// What a turn takes before any run has measured it: the system prompt and the tools again at each of a few steps.
export const FIRST_TURN_ESTIMATE: Tokens = {
  inputTokens: 20_000,
  outputTokens: 600,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

const savedRunSchema = z.object({ totals: z.object({ turns: z.int(), tokens: z.custom<Tokens>() }) });

// The tokens of a turn on average in the newest saved run, or the first estimate when there is none.
export function tokensPerTurn(results: URL): Tokens {
  const newest = existsSync(results)
    ? readdirSync(results)
        .filter((name) => name.endsWith('.json'))
        .map((name) => new URL(name, results))
        .toSorted((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
        .at(0)
    : undefined;
  if (newest === undefined) {
    return FIRST_TURN_ESTIMATE;
  }
  const saved = savedRunSchema.safeParse(JSON.parse(readFileSync(newest, 'utf8')));
  if (!saved.success || saved.data.totals.turns === 0) {
    return FIRST_TURN_ESTIMATE;
  }
  const { turns, tokens } = saved.data.totals;
  return {
    inputTokens: tokens.inputTokens / turns,
    outputTokens: tokens.outputTokens / turns,
    cacheReadTokens: tokens.cacheReadTokens / turns,
    cacheWriteTokens: tokens.cacheWriteTokens / turns,
  };
}
