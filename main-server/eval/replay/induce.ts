/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { createHash } from 'node:crypto';
import { openRouterModel } from '../../src/assistant/adapter.js';
import { type Standing } from '../../src/assistant/induction/gate.js';
import { induce, type InductionResult } from '../../src/assistant/induction/induction.js';
import { labelRows, reportOf } from '../../src/assistant/induction/induction.service.js';
import { type LabelRow } from '../../src/assistant/induction/instances.js';
import { HOLDOUT_PERCENT, type Instance, instancesOf, split } from '../../src/assistant/induction/instances.js';
import { type Attempt } from '../../src/assistant/induction/loop.js';
import { ModelReflector, type Reflector } from '../../src/assistant/induction/reflector.js';
import { heldBack } from '../../src/common/holdback.js';
import { normaliseWords } from '../../src/common/normalise-words.js';
import { settingsSchema } from '../../src/common/settings.js';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import { catalogOf, connectToDatabase } from './database.ts';
import { type InduceFlags, induceFlags } from './flags.ts';
import { acceptedIds, type GoldItem, itemsOf, loadGold } from './gold.ts';
import { type RulesFile } from './induced.ts';
import { saveReport, table } from './report.ts';

// `pnpm eval:induce [--as-of <day>] [--development [--fold i/k]] [--budget 12] [--seed 1]` (P07 ticket 07): one
// induction run over the database's rows before --as-of, from no rules, with the Assistant's model as the reflector,
// written to eval/results/replay-induced-<time>.json (the rules in force after the run, with the run's trace) and the
// same as Markdown. Nothing is written to the database. With --development, the gold development set's items join the
// instances, each as an account of its own, as the team wrote them; --fold i/k holds the i-th of k folds of them out,
// so that stage E can be scored on the fold the run never trained on. It calls the model.

// Which fold of k the words fall in, by a stable hash.
function foldIndex(words: string, count: number): number {
  return createHash('sha256').update(words).digest().readUInt32BE(0) % count;
}

// The development items that mean one Place, as instances.
export function goldInstances(
  items: readonly GoldItem[],
  places: readonly PlaceDto[],
  fold: InduceFlags['fold'],
): Instance[] {
  const accepted = acceptedIds(items, places);
  return items.flatMap((item, index) => {
    const ids = [...(accepted[index] ?? [])];
    const placeId = ids[0];
    const words = normaliseWords(item.words);
    if (ids.length !== 1 || placeId === undefined || words === '') {
      return [];
    }
    const heldOut = fold === null ? heldBack(words, HOLDOUT_PERCENT) : foldIndex(words, fold.count) === fold.index;
    return [{ words, placeId, accounts: [`gold:${words}`], eventIds: [], heldOut }];
  });
}

// The words the reflector was shown, the training instances': a gold item among them is scored without the run's
// rules. The held-out words are scored with them, though the gate read them, so that number is a validation score.
function trainedWordsOf(rows: readonly LabelRow[], extra: readonly Instance[]): string[] {
  const { train } = split([...instancesOf(rows), ...extra]);
  return [...new Set(train.map(({ words }) => words))].toSorted();
}

export async function induceFile(
  prisma: PrismaClient,
  { asOf, development, fold, budget, seed }: InduceFlags,
  reflector: Reflector,
): Promise<{ file: RulesFile; result: InductionResult }> {
  const places = await catalogOf(prisma);
  const rows = await labelRows(prisma, asOf);
  const extra = development ? goldInstances(itemsOf(loadGold(), 'development'), places, fold) : [];
  const result = await induce({ places, rows, extra, active: [], reflector, budget, seed });
  const file: RulesFile = {
    asOf: asOf.toISOString(),
    model: reflector.modelId,
    budget,
    seed,
    trainedWords: trainedWordsOf(rows, extra),
    rules: result.kept.map((standing) => reportOf(standing)),
    trace: traceOf(result),
  };
  return { file, result };
}

function traceOf({ instances, evolution, promoted, refused, retired }: InductionResult): object {
  return {
    instances,
    candidates: evolution.candidates,
    attempts: evolution.attempts,
    promoted: promoted.map((standing) => reportOf(standing)),
    refused: refused.map((standing) => reportOf(standing)),
    retired: retired.map((standing) => reportOf(standing)),
  };
}

function rulesTable(standings: readonly Standing[]): string {
  return table(
    ['Kind', 'Pattern', 'Replace', 'Example', 'Fixed', 'Broke', 'Accounts', 'Held-out gain'],
    standings.map(({ rule, example, fixed, broke, accounts, heldOutGain }) => [
      rule.kind,
      `\`${rule.pattern}\``,
      `\`${rule.replace}\``,
      example ?? '—',
      String(fixed),
      String(broke),
      String(accounts),
      String(heldOutGain),
    ]),
  );
}

function attemptLines(attempts: readonly Attempt[]): string[] {
  return attempts.flatMap(({ call, parentRules, minibatch, proposals, note }) => [
    `- Call ${call}, parent of ${parentRules} rules, minibatch: ${minibatch.join(', ')}` +
      (note === null ? '' : ` (${note})`),
    ...proposals.map(
      ({ kind, pattern, replace, why, outcome }) =>
        `  - ${kind} \`${pattern}\` → \`${replace}\` (${why === '' ? 'no reason given' : why}): ${outcome}`,
    ),
  ]);
}

export function inducedMarkdown(file: RulesFile, result: InductionResult, flags: InduceFlags): string {
  const { instances, evolution, promoted, refused, retired, kept } = result;
  return [
    '# Induced rules',
    '',
    `Rows before ${file.asOf}${flags.development ? ` and the gold development set${flags.fold === null ? '' : ` less fold ${flags.fold.index + 1} of ${flags.fold.count}`}` : ''}: ` +
      `${instances.train} training instances, ${instances.heldOut} held out. ${evolution.attempts.length} reflector calls ` +
      `to ${file.model} (budget ${file.budget}, seed ${file.seed}), ${evolution.candidates} candidates, ` +
      `${promoted.length} rules promoted, ${refused.length} refused, ${retired.length} retired, ${kept.length} in force.`,
    '',
    '## Rules in force',
    '',
    kept.length === 0 ? 'None.' : rulesTable(kept),
    '',
    '## Refused by the gate',
    '',
    refused.length === 0 ? 'None.' : rulesTable(refused),
    '',
    '## Calls',
    '',
    ...(evolution.attempts.length === 0 ? ['None: nothing to fix, or no instance.'] : attemptLines(evolution.attempts)),
  ].join('\n');
}

function reflectorOf(env: NodeJS.ProcessEnv): Reflector {
  const apiKey = settingsSchema.shape.OPENROUTER_API_KEY.parse(env.OPENROUTER_API_KEY);
  const modelId = settingsSchema.shape.ASSISTANT_MODEL.parse(env.ASSISTANT_MODEL);
  const timeoutMs = settingsSchema.shape.ASSISTANT_TIMEOUT_MS.parse(env.ASSISTANT_TIMEOUT_MS);
  if (apiKey === '' || modelId === '') {
    throw new Error('Set OPENROUTER_API_KEY and ASSISTANT_MODEL, in the environment or in main-server/.env.');
  }
  return new ModelReflector(openRouterModel(apiKey, modelId), modelId, timeoutMs);
}

export async function main(argv: string[]): Promise<number> {
  const startedAt = new Date();
  const flags = induceFlags(argv, startedAt);
  const reflector = reflectorOf(process.env);
  const prisma = connectToDatabase();
  try {
    const { file, result } = await induceFile(prisma, flags, reflector);
    for (const written of saveReport('induced', file, inducedMarkdown(file, result, flags), startedAt)) {
      console.log(written);
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}
