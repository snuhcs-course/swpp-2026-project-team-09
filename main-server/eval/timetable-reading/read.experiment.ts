/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { wrapLanguageModel } from 'ai';
import { modelThrough } from '../../src/assistant/model-port.js';
import { checkedReading } from '../../src/timetable-reading/reading-checks.js';
import { readAnswer } from '../../src/timetable-reading/timetable-reading.service.js';
import { blocksOf, gridOf } from './boxes.ts';
import { imageOf, namesOf, scoreReading, truthOf } from './score.ts';

// P15-52's experiment: reads each screenshot READS times (default 3) as the server does (`readAnswer`), with Claude
// Haiku 5.5 on the Anthropic API unless MODEL names another, and saves each final answer in
// answers/<RUN>/<name>.<n>.json with its tokens, calls and time; prints each reading's score and the cost.
//
//   READ_MODE=grid    the phone's label-free grid is sent (grids/), the model reads labels, text and rough times
//   READ_MODE=blocks  the earlier design: blocks placed with ML Kit's labels (blocks/), the model reads their text
//   READ_MODE=whole   the picture alone
//   ONLY=snutt-1,snutt-4   some screenshots; SYNTHETIC=1 the synthetic ones too
//
// The key is ANTHROPIC_API_KEY, from the environment or from the .env file ENV_FILE names; it is never printed.
//
//   ENV_FILE=../path/.env RUN=g1 READ_MODE=grid pnpm eval:timetable

// USD per token, input and output (the claude-api reference, 2026-11-03).
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1e-6, output: 0.5e-6 },
  'claude-sonnet-5-5': { input: 2e-6, output: 10e-6 },
};

const RUN = process.env.RUN ?? 'run';
const ANSWERS = new URL(`answers/${RUN}/`, import.meta.url);

function apiKey(): string {
  const file = process.env.ENV_FILE;
  const line =
    file === undefined
      ? undefined
      : readFileSync(file, 'utf8')
          .split('\n')
          .find((one) => one.startsWith('ANTHROPIC_API_KEY='));
  return (
    process.env.ANTHROPIC_API_KEY ?? line?.slice('ANTHROPIC_API_KEY='.length).trim().replaceAll(/^"|"$/gu, '') ?? ''
  );
}

function say(line: string): void {
  process.stdout.write(`${line}\n`);
  writeFileSync(new URL('log.txt', ANSWERS), `${line}\n`, { flag: 'a' });
}

interface Usage {
  input: number;
  output: number;
  calls: number;
}

// The model on the Anthropic API, adding each call's tokens to `usage`.
function countedModel(modelId: string, usage: Usage): ReturnType<typeof wrapLanguageModel> {
  return wrapLanguageModel({
    model: modelThrough('anthropic', apiKey(), modelId, 'off'),
    middleware: {
      wrapGenerate: async ({ doGenerate }) => {
        const result = await doGenerate();
        usage.input += result.usage.inputTokens.total ?? 0;
        usage.output += result.usage.outputTokens.total ?? 0;
        usage.calls += 1;
        return result;
      },
    },
  });
}

interface Run {
  model: ReturnType<typeof wrapLanguageModel>;
  modelId: string;
  mode: string;
  usage: Usage;
  prices: { input: number; output: number };
}

// One reading of one screenshot: saved, scored and logged; its cost in USD.
async function readOnce(
  run: Run,
  name: string,
  n: number,
  image: { data: Uint8Array; mediaType: string },
): Promise<number> {
  const { model, modelId, mode, usage, prices } = run;
  const found = mode === 'grid' ? { grid: gridOf(name) } : mode === 'blocks' ? { blocks: blocksOf(name) } : {};
  const before = { ...usage };
  const started = performance.now();
  const { answer, mapped, raw } = await readAnswer(model, image, found, { timeoutMs: 120_000, maxOutputTokens: 8000 });
  const ms = Math.round(performance.now() - started);
  const [input, output, calls] = [usage.input - before.input, usage.output - before.output, usage.calls - before.calls];
  const spent = input * prices.input + output * prices.output;
  const saved = {
    screenshot: name,
    model: modelId,
    mode,
    mapped,
    ms,
    inputTokens: input,
    outputTokens: output,
    calls,
    answer,
    raw,
  };
  writeFileSync(new URL(`${name}.${n}.json`, ANSWERS), `${JSON.stringify(saved, null, 2)}\n`);
  const { wrong, ...counts } = scoreReading(checkedReading(answer), truthOf(name));
  const faults = wrong.length === 0 ? '' : `\n  ${wrong.join('\n  ')}`;
  say(
    `${name}.${n} ${ms} ms, ${calls} calls, mapped ${String(mapped)}, ${input}/${output} tokens, USD ${spent.toFixed(5)}: ${JSON.stringify(counts)}${faults}`,
  );
  return spent;
}

it('reads the screenshots', async () => {
  const modelId = process.env.MODEL ?? 'claude-haiku-5-5';
  const prices = PRICES[modelId];
  expect(prices).toBeDefined();
  const usage = { input: 0, output: 0, calls: 0 };
  const run: Run = {
    model: countedModel(modelId, usage),
    modelId,
    mode: process.env.READ_MODE ?? 'grid',
    usage,
    prices: prices ?? { input: 0, output: 0 },
  };
  const reads = Number(process.env.READS ?? '3');
  const names = namesOf(process.env.SYNTHETIC === '1').filter(
    (name) => process.env.ONLY === undefined || process.env.ONLY.split(',').includes(name),
  );
  mkdirSync(ANSWERS, { recursive: true });
  let cost = 0;
  for (const name of names) {
    const image = imageOf(name);
    if (image === null) {
      say(`${name}: no PNG, skipped`);
      continue;
    }
    for (let n = 1; n <= reads; n += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one reading after another, so that each is timed alone
      cost += await readOnce(run, name, n, image);
    }
  }
  say(`Total USD ${cost.toFixed(4)}`);
});
