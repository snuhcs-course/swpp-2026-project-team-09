/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { startVitest } from 'vitest/node';
import { pricesOf } from '../cost.ts';
import { dotEnv } from '../options.ts';
import { COLLECTION_RUN_ENV, type CollectionOptions, mayCallModel, parseCollectionFlags } from './run-options.ts';
import { readCollectionFile, setASchema, setBSchema } from './sets.ts';

// `pnpm eval:collection --run <name> [flags]`: one run of evaluation A or B, on a clean tree, with no database. See
// README.md. It starts the run's own Vitest project, so that the server's code loads as it does under test, and CI, which
// uses vitest.config.ts, never includes it. It never prints the OpenRouter key.

const C0_TAG = 'eval-freeze-iter3-collection';
const DEFAULT_MODEL = 'anthropic/claude-haiku-5.5';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 4000;

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function isAncestor(tag: string): boolean {
  try {
    git('merge-base', '--is-ancestor', tag, 'HEAD');
    return true;
  } catch {
    return false;
  }
}

function setHash(): string {
  const ids = [
    ...readCollectionFile('set-a.yaml', setASchema).map(({ id }) => id),
    ...readCollectionFile('set-b.yaml', setBSchema).map(({ id }) => id),
  ].toSorted();
  return createHash('sha256').update(ids.join('\n')).digest('hex');
}

// The dated id OpenRouter lists for the model today, from its public list, which needs no key.
async function canonicalSlugOf(model: string): Promise<string | null> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- read only for the record, and null when it is not so
    const { data } = (await response.json()) as { data: { id: string; canonical_slug?: string }[] };
    return data.find(({ id }) => id === model)?.canonical_slug ?? null;
  } catch {
    return null;
  }
}

async function main(): Promise<number> {
  const flags = parseCollectionFlags(process.argv.slice(2));
  const env = dotEnv();
  const isDirty = git('status', '--porcelain', '--untracked-files=all') !== '';
  if (isDirty && !flags.allowDirty) {
    console.error('The tree has changes, tracked or not: a run is on a clean commit (metrics document, 4.3).');
    return 1;
  }
  const model = env.ASSISTANT_MODEL ?? DEFAULT_MODEL;
  if (mayCallModel({ run: flags.run, noModel: flags.noModel }) && (env.OPENROUTER_API_KEY ?? '') === '') {
    console.error('Set OPENROUTER_API_KEY in main-server/.env.');
    return 1;
  }
  const options: CollectionOptions = {
    ...flags,
    model,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    command: `pnpm eval:collection ${process.argv.slice(2).join(' ')}`,
    commit: git('rev-parse', 'HEAD'),
    isDirty,
    c0Tag: C0_TAG,
    isDescendantOfC0: isAncestor(C0_TAG),
    setHash: setHash(),
    thresholdsBlob: git('rev-parse', 'HEAD:main-server/eval/collection/thresholds.yaml'),
    canonicalSlug: await canonicalSlugOf(model),
    prices: await pricesOf(model),
  };
  console.log(`Run ${options.run} over the ${options.part} part, at ${options.commit}${isDirty ? ' (dirty)' : ''}`);
  process.env[COLLECTION_RUN_ENV] = JSON.stringify(options);
  const vitest = await startVitest('test', [], {
    config: 'eval/collection/vitest.config.ts',
    run: true,
    watch: false,
  });
  await vitest.close();
  return process.exitCode === undefined ? 0 : Number(process.exitCode);
}

process.exitCode = await main();
