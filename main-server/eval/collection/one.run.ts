/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { modelThrough } from '../../src/assistant/model-port.js';
import { MODEL_SETTINGS } from '../../src/common/settings.js';
import { JUDGEMENT_CHECKS } from '../../src/global-events/judgement-answer.js';
import { POST_SOURCES } from '../../src/global-events/post-sources.js';
import { dotEnv } from '../options.ts';
import { goldPairs, goldPosts, labelledPlaces, savedPage, savedPosts } from './gold.ts';
import { storedChoicesSchema, storedJudgementSchema } from './model-calls.ts';
import { workerParsers } from './read-post.ts';
import { reportOf, type RunRecord } from './report.ts';
import { RUN_SWITCHES, runCollection, type RunOutcome } from './run.ts';
import { COLLECTION_RUN_ENV, collectionOptionsSchema, type CollectionOptions, mayCallModel } from './run-options.ts';

// The one run `pnpm eval:collection` starts. It saves its answers beside its record in eval/results/, whatever scores
// they gave, so that a later run reads them and any run can be scored again.

const RESULTS = new URL('../results/', import.meta.url);

const savedRunSchema = z.object({
  calls: z.object({
    judgements: z.record(z.string(), storedJudgementSchema),
    choices: z.record(z.string(), storedChoicesSchema),
  }),
});

function savedCalls({ from }: CollectionOptions): z.infer<typeof savedRunSchema>['calls'] {
  return from === null
    ? { judgements: {}, choices: {} }
    : savedRunSchema.parse(JSON.parse(readFileSync(from, 'utf8'))).calls;
}

function recordOf(options: CollectionOptions, outcome: RunOutcome, startedAt: string): RunRecord {
  return {
    run: options.run,
    command: options.command,
    commit: options.commit,
    c0Tag: options.c0Tag,
    isDescendantOfC0: options.isDescendantOfC0,
    setHash: options.setHash,
    thresholdsBlob: options.thresholdsBlob,
    startedAt,
    endedAt: new Date().toISOString(),
    part: options.part,
    provider: options.provider,
    cache: options.cache,
    modelAsked: options.model,
    // On the Anthropic path, the dated id the first response named.
    canonicalSlug: options.canonicalSlug ?? (options.provider === 'anthropic' ? (outcome.modelIds[0] ?? null) : null),
    modelsAnswered: outcome.modelIds,
    limits: { timeoutMs: options.timeoutMs, maxOutputTokens: options.maxOutputTokens },
    switches: RUN_SWITCHES[options.run],
    campusDefault: {
      snu_events: POST_SOURCES.snu_events.campusDefault,
      extra_snu: POST_SOURCES.extra_snu.campusDefault,
    },
    checks: JUDGEMENT_CHECKS,
    from: options.from,
    usage: outcome.usage,
    budgetUsd: options.budgetUsd,
    pricesSource: options.prices.source,
  };
}

it('runs', async () => {
  const options = collectionOptionsSchema.parse(JSON.parse(process.env[COLLECTION_RUN_ENV] ?? '{}'));
  const startedAt = new Date().toISOString();
  const key = dotEnv()[MODEL_SETTINGS[options.provider].key] ?? '';
  const outcome = await runCollection({
    run: options.run,
    part: options.part,
    golds: goldPosts(options.part),
    pairs: goldPairs(options.part),
    saved: savedPosts(),
    page: savedPage,
    parsers: await workerParsers(),
    places: labelledPlaces(),
    model: mayCallModel(options) ? modelThrough(options.provider, key, options.model, options.cache) : null,
    prices: options.prices,
    budgetUsd: options.budgetUsd,
    limits: { timeoutMs: options.timeoutMs, maxOutputTokens: options.maxOutputTokens },
    calls: savedCalls(options),
  });
  const record = recordOf(options, outcome, startedAt);
  mkdirSync(RESULTS, { recursive: true });
  // The provider and the caching mode name the file too (spec A01).
  const path = `${options.provider}-cache${options.cache}`;
  const name = `collection-${options.part}-${options.run}-${path}-${options.commit.slice(0, 8)}`;
  writeFileSync(new URL(`${name}.json`, RESULTS), `${JSON.stringify({ record, ...outcome }, null, 2)}\n`);
  writeFileSync(new URL(`${name}.md`, RESULTS), reportOf(record, outcome));
  console.log(`Saved in eval/results/${name}.json and .md, at USD ${outcome.usage.costUsd.toFixed(4)}`);
  expect(outcome.stopped).toBeNull();
});
