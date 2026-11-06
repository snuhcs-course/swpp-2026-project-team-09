/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { startVitest } from 'vitest/node';
import { repetitionsOf, selectCases, sentTurnsOf, unlabelled } from './cases.ts';
import { costOf, pricesOf, tokensPerTurn } from './cost.ts';
import { MODEL_SETTINGS } from '../src/common/settings.ts';
import { dotEnv, parseFlags, RUN_ENV, type RunOptions } from './options.ts';
import { casesToRun } from './p4/holdout.ts';

// `pnpm eval [flags]`: reads the flags against the branch's settings, shows what the run will cost and asks first,
// then starts the benchmark's Vitest project (eval/vitest.config.ts) with the options in EVAL_RUN. See README.md,
// "Benchmark". It never prints the provider's key.

const RESULTS = new URL('results/', import.meta.url);

const PRICES_FROM = {
  anthropic: "Anthropic's listed prices (eval/cost.ts)",
  openrouter: "OpenRouter's prices",
  fallback: "fallback prices (USD 5 and 25 per million tokens), the model not being in OpenRouter's list",
};

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

// The commit measured, marked when files were changed on top of it.
function commit(): string {
  const changed = git('status', '--porcelain', '--untracked-files=no') !== '';
  return `${git('rev-parse', '--short', 'HEAD')}${changed ? '-dirty' : ''}`;
}

async function confirmed(): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.error('Not a terminal: pass --yes to run without asking.');
    return false;
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question('Run it? [y/N] ');
  prompt.close();
  return /^y(?:es)?$/iu.test(answer.trim());
}

async function main(): Promise<number> {
  const env = dotEnv();
  const { options: flags, yes } = parseFlags(process.argv.slice(2), env);
  const provider = flags.provider ?? 'openrouter';
  const { key } = MODEL_SETTINGS[provider];
  if ((env[key] ?? '') === '') {
    console.error(`Set ${key} in main-server/.env.`);
    return 1;
  }
  const options: RunOptions = { ...flags, prices: await pricesOf(provider, flags.model), commit: commit() };
  const cases = selectCases(casesToRun(options), options.categories, options.caseIds);
  // A suite before its labels are drafted (eval/p6/ before C0) loads and runs, but scores nothing: say so first.
  const unscored = unlabelled(cases).length;
  if (unscored > 0) {
    console.log(`${unscored} of the cases have no expectation yet, so the scorecard fails them`);
  }
  const turns = cases.reduce(
    (total, evalCase) => total + sentTurnsOf(evalCase) * repetitionsOf(evalCase, options.repeat),
    0,
  );
  const perTurn = tokensPerTurn(RESULTS);
  const estimate = costOf(
    {
      inputTokens: perTurn.inputTokens * turns,
      outputTokens: perTurn.outputTokens * turns,
      cacheReadTokens: perTurn.cacheReadTokens * turns,
      cacheWriteTokens: perTurn.cacheWriteTokens * turns,
    },
    options.prices,
  );
  const { model, cache, temperature, topP, maxSteps, timeoutMs, maxOutputTokens } = options;
  console.log(
    [
      `Model ${model} through ${provider}, cache ${cache ?? 'off'}, ` +
        `temperature ${temperature ?? 'default'}, top-p ${topP ?? 'default'}`,
      `Limits: ${maxSteps} steps, ${timeoutMs} ms, ${maxOutputTokens} output tokens per call`,
      `${cases.length} cases, ${turns} turns, about ${Math.round(perTurn.inputTokens)} input and ` +
        `${Math.round(perTurn.outputTokens)} output tokens a turn`,
      `Estimated cost USD ${estimate.toFixed(2)} at ${PRICES_FROM[options.prices.source]}; ` +
        `the run stops past USD ${options.budgetUsd}`,
    ].join('\n'),
  );
  if (!yes && !(await confirmed())) {
    return 1;
  }
  process.env[RUN_ENV] = JSON.stringify(options);
  const vitest = await startVitest('test', [], { config: 'eval/vitest.config.ts', run: true, watch: false });
  await vitest.close();
  return process.exitCode === undefined ? 0 : Number(process.exitCode);
}

process.exitCode = await main();
