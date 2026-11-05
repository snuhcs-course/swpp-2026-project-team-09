/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { z } from 'zod';
import { type ModelProvider } from '../src/common/settings.ts';

// What a run costs (spec P19, "Cost"), an estimate from the provider's listed prices: before the run, from the number
// of turns and the tokens a turn took in the last run, and during it, from the tokens the model reported. The budget
// relies on it; the spend limit of the Anthropic account, or a credit limit on the OpenRouter key, is the hard stop.

// USD per token.
export const pricesSchema = z.strictObject({
  input: z.number().min(0),
  output: z.number().min(0),
  cacheRead: z.number().min(0),
  cacheWrite: z.number().min(0),
  // Where the prices came from: Anthropic's table below, OpenRouter's list, or the fallback when the model is in
  // neither.
  source: z.enum(['anthropic', 'openrouter', 'fallback']),
});

export type Prices = z.infer<typeof pricesSchema>;

// Anthropic's listed prices for the models we call through the Anthropic API, in USD per token (spec A01). Source:
// Anthropic's pricing as the claude-api reference listed it on 2026-10-06, read 2026-11-05. Claude Haiku 5.5 is USD 0.10
// and 0.50 per million input and output tokens for a prompt of up to 100K tokens, which ours stay below, and USD 0.50
// and 2.50 above: this table holds the first rate only. A cache read is 0.1 times the input price and a cache write,
// at the 5-minute lifetime the requests use, 1.25 times.
export const ANTHROPIC_PRICES: Readonly<Record<string, Prices>> = {
  'claude-haiku-5-5': { input: 0.1e-6, output: 0.5e-6, cacheRead: 0.01e-6, cacheWrite: 0.125e-6, source: 'anthropic' },
};

// Prices well above a small model's, for a model neither list has: USD 5 and 25 per million tokens.
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

// The model's prices on the provider's path: from the Anthropic table, or from OpenRouter's public list of models,
// which needs no key; or the fallback.
export async function pricesOf(
  provider: ModelProvider,
  model: string,
  fetchList: typeof fetch = fetch,
): Promise<Prices> {
  if (provider === 'anthropic') {
    return ANTHROPIC_PRICES[model] ?? FALLBACK_PRICES;
  }
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
