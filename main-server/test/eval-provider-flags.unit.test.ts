/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { FALLBACK_PRICES } from '../eval/cost.ts';
import { parseFlags, type RunOptions, runName } from '../eval/options.ts';

// `pnpm eval`'s provider and caching mode (specs A01 and A02): from --provider, OpenRouter by default, and --cache or
// MODEL_CACHE, with the provider's fixed model unless --model names another, and named in the run's file. The
// global setting llm.key plays no part.

describe('The provider of a run', () => {
  it("is OpenRouter by default, with its model, and OpenRouter's requests cache nothing", () => {
    expect(parseFlags([], { MODEL_CACHE: 'auto' }).options).toMatchObject({
      provider: 'openrouter',
      cache: 'off',
      model: 'anthropic/claude-haiku-5.5',
    });
  });

  it("is --provider's, with that provider's model and MODEL_CACHE's mode", () => {
    expect(parseFlags(['--provider', 'anthropic'], { MODEL_CACHE: 'auto' }).options).toMatchObject({
      provider: 'anthropic',
      cache: 'auto',
      model: 'claude-haiku-5-5',
    });
  });

  it('takes --cache over MODEL_CACHE, and --model over the provider’s model', () => {
    const argv = ['--provider', 'anthropic', '--cache', 'off', '--model', 'claude-other'];

    expect(parseFlags(argv, { MODEL_CACHE: 'auto' }).options).toMatchObject({
      provider: 'anthropic',
      cache: 'off',
      model: 'claude-other',
    });
  });

  it.each([
    [['--provider', 'claude']],
    [['--provider', 'anthropic', '--cache', 'on']],
    // The Anthropic API refuses sampling, and OpenRouter's requests cache nothing.
    [['--provider', 'anthropic', '--temperature', '0.2']],
    [['--provider', 'anthropic', '--top-p', '0.9']],
    [['--provider', 'openrouter', '--cache', 'auto']],
  ])('refuses %j', (argv) => {
    expect(() => parseFlags(argv, {})).toThrow();
  });
});

const OPTIONS: RunOptions = {
  provider: 'anthropic',
  cache: 'auto',
  model: 'claude-haiku-5-5',
  temperature: null,
  topP: null,
  maxSteps: 8,
  timeoutMs: 30_000,
  maxOutputTokens: 4000,
  repeat: null,
  categories: [],
  caseIds: [],
  budgetUsd: 1,
  world: 'small',
  prices: FALLBACK_PRICES,
  commit: 'abc1234',
};

describe("A run's file name", () => {
  it('names the provider beside the model, and the caching mode', () => {
    expect(runName(OPTIONS, new Date())).toMatch(
      /^\d{4}-\d{2}-\d{2}-abc1234-anthropic-claude-haiku-5-5-s8-t30000-o4000-tempdefault-toppdefault-cacheauto$/u,
    );
  });

  it('of a run saved before A01, with neither, is as it was', () => {
    const { provider: _provider, cache: _cache, ...before } = OPTIONS;

    expect(runName({ ...before, model: 'anthropic/claude-haiku-5.5' }, new Date())).toMatch(
      /^\d{4}-\d{2}-\d{2}-abc1234-anthropic_claude-haiku-5\.5-s8-t30000-o4000-tempdefault-toppdefault$/u,
    );
  });
});
