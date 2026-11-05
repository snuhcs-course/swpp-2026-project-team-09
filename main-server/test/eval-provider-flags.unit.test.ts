/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { FALLBACK_PRICES } from '../eval/cost.ts';
import { parseFlags, type RunOptions, runName } from '../eval/options.ts';

// `pnpm eval`'s provider and caching mode (spec A01): from MODEL_PROVIDER and MODEL_CACHE, or from --provider and
// --cache, with the chosen provider's model setting, and named in the run's file.

const MODELS = { ANTHROPIC_MODEL: 'claude-haiku-5-5', ASSISTANT_MODEL: 'anthropic/claude-haiku-5.5' };

describe('The provider of a run', () => {
  it("is MODEL_PROVIDER's, with that provider's model, and OpenRouter's caches nothing", () => {
    const env = { ...MODELS, MODEL_PROVIDER: 'openrouter', MODEL_CACHE: 'auto' };

    expect(parseFlags([], env).options).toMatchObject({
      provider: 'openrouter',
      cache: 'off',
      model: 'anthropic/claude-haiku-5.5',
    });
  });

  it("is refused without the chosen provider's model, the other's being set", () => {
    expect(() => parseFlags([], { MODEL_PROVIDER: 'openrouter', ANTHROPIC_MODEL: 'claude-haiku-5-5' })).toThrow();
    expect(() => parseFlags([], { ASSISTANT_MODEL: 'anthropic/claude-haiku-5.5' })).toThrow();
  });

  it('is the flags’ over the settings', () => {
    const env = { ...MODELS, MODEL_PROVIDER: 'openrouter', MODEL_CACHE: 'auto' };

    expect(parseFlags(['--provider', 'anthropic', '--cache', 'off'], env).options).toMatchObject({
      provider: 'anthropic',
      cache: 'off',
      model: 'claude-haiku-5-5',
    });
  });

  it.each([
    [['--provider', 'claude']],
    [['--cache', 'on']],
    // The Anthropic API refuses sampling, and OpenRouter's requests cache nothing.
    [['--temperature', '0.2']],
    [['--top-p', '0.9']],
    [['--provider', 'openrouter', '--cache', 'auto']],
  ])('refuses %j', (argv) => {
    expect(() => parseFlags(argv, MODELS)).toThrow();
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
