/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ANTHROPIC_PRICES, costOf, FALLBACK_PRICES, pricesOf } from '../eval/cost.ts';

// A run's cost on the Anthropic path (spec A01): Anthropic's listed prices from the table, with the cache's own.

const refuseList = (): Promise<Response> => Promise.reject(new Error('The Anthropic path reads no list'));

describe('The prices on the Anthropic path', () => {
  it("are Claude Haiku 5.5's from the table, up to 100K prompt tokens, read from no list", async () => {
    expect(await pricesOf('anthropic', 'claude-haiku-5-5', refuseList)).toEqual({
      input: 0.1e-6,
      output: 0.5e-6,
      cacheRead: 0.01e-6,
      cacheWrite: 0.125e-6,
      source: 'anthropic',
    });
  });

  it('are the fallback for a model the table does not have, such as an OpenRouter id', async () => {
    expect(await pricesOf('anthropic', 'anthropic/claude-haiku-5.5', refuseList)).toEqual(FALLBACK_PRICES);
  });

  it('price a run with cache reads and writes at their own rates', () => {
    const tokens = {
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      cacheReadTokens: 600_000,
      cacheWriteTokens: 200_000,
    };

    // 200K uncached at 0.10, 600K read at 0.01, 200K written at 0.125, 100K out at 0.50, in USD per million.
    expect(costOf(tokens, ANTHROPIC_PRICES['claude-haiku-5-5'])).toBeCloseTo(0.02 + 0.006 + 0.025 + 0.05, 10);
  });
});

// OpenRouter's public list, with Claude Haiku 5.5 only.
const openRouterList = (): Promise<Response> =>
  Promise.resolve(
    Response.json({
      data: [{ id: 'anthropic/claude-haiku-5.5', pricing: { prompt: '0.0000001', completion: '0.0000005' } }],
    }),
  );

describe('The prices on the OpenRouter path', () => {
  it("are still OpenRouter's list", async () => {
    expect(await pricesOf('openrouter', 'anthropic/claude-haiku-5.5', openRouterList)).toEqual({
      input: 1e-7,
      output: 5e-7,
      cacheRead: 1e-7,
      cacheWrite: 1e-7,
      source: 'openrouter',
    });
  });
});
