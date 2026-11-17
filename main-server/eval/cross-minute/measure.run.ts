/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { anthropicModel, type Model, type RunObserver, runFeature, type StepEnd } from '../../src/assistant/adapter.js';
import { chatAssistant } from '../../src/assistant/chat/chat-assistant.js';
import { NO_CONTEXT } from '../../src/assistant/dto/answer.dto.js';
import { CLIENT_CAPABILITIES, type Feature } from '../../src/assistant/feature.js';
import { chatServicesWithoutData } from '../../test/chat-services.js';
import { ANTHROPIC_PRICES, costOf, type Prices } from '../cost.ts';
import { dotEnv, EVAL_KEYS } from '../options.ts';

// `pnpm eval:cross-minute`: whether the chat's cached prefix, the tools and the system prompt up to the breakpoint, is
// shared across minutes and Users (P15 ticket 51). The benchmark cannot show it, since it fixes `now`. Here the same
// short conversation is sent N times on the Anthropic path, `breakpoints` caching, each one minute later than the one
// before and as another User, one after another in real time, and each call's cache reads and writes are recorded.
// The chat is the one of an app that says every capability, built over services that hold no data: the message is
// small talk, which needs no tool, and a tool the model calls anyway fails and is recorded as a step. It saves its
// record in eval/results/cross-minute-cache-<commit>.{json,md}. It never prints the key.
//
// CROSS_MINUTE_YES=1 is needed to call the model; CROSS_MINUTE_N sets N (10).

const MODEL = 'claude-haiku-5-5';
const MESSAGE = '안녕하세요!';
const FIRST_NOW = new Date('2026-11-18T00:05:00Z');
const MINUTE_MS = 60_000;
const LIMITS = { maxSteps: 8, timeoutMs: 30_000, maxOutputTokens: 4000 };
const RESULTS = new URL('../results/', import.meta.url);

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function commit(): string {
  const changed = git('status', '--porcelain', '--untracked-files=no') !== '';
  return `${git('rev-parse', '--short', 'HEAD')}${changed ? '-dirty' : ''}`;
}

interface RequestRecord {
  index: number;
  userId: string;
  now: string;
  steps: StepEnd[];
  toolCalls: string[];
  reply: string | null;
  error: string | null;
  cost: number;
}

const usd = (value: number): string => value.toFixed(6);
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

function costOfSteps(steps: StepEnd[], prices: Prices): number {
  return sum(
    steps.map((step) =>
      costOf(
        {
          inputTokens: step.inputTokens ?? 0,
          outputTokens: step.outputTokens ?? 0,
          cacheReadTokens: step.cacheReadTokens ?? 0,
          cacheWriteTokens: step.cacheWriteTokens ?? 0,
        },
        prices,
      ),
    ),
  );
}

// The `index`th request: `index` minutes after the first, by its own User.
async function sent(model: Model, feature: Feature, index: number): Promise<RequestRecord> {
  const now = new Date(FIRST_NOW.getTime() + index * MINUTE_MS);
  const userId = `cross-minute-user-${index + 1}`;
  const steps: StepEnd[] = [];
  const toolCalls: string[] = [];
  const observer: RunObserver = {
    toolEnded: ({ name }): void => {
      toolCalls.push(name);
    },
    stepEnded: (step): void => {
      steps.push(step);
    },
    replied: (): void => undefined,
  };
  const asker = { userId, now, capabilities: CLIENT_CAPABILITIES, context: NO_CONTEXT };
  let reply: string | null = null;
  let error: string | null = null;
  try {
    reply = (await runFeature(model, feature, asker, [{ role: 'user', text: MESSAGE }], LIMITS, observer)).text;
  } catch (thrown) {
    error = thrown instanceof Error ? thrown.name : String(thrown);
  }
  const cost = costOfSteps(steps, ANTHROPIC_PRICES[MODEL]);
  return { index, userId, now: now.toISOString(), steps, toolCalls, reply, error, cost };
}

function markdownOf(at: string, startedAt: string, endedAt: string, records: RequestRecord[]): string {
  const rows = records.map(({ index, userId, now, steps, cost, error }) => {
    const [first] = steps;
    return `| ${index + 1} | ${userId} | ${now} | ${steps.length} | ${first?.inputTokens ?? '-'} | ${first?.cacheReadTokens ?? '-'} | ${first?.cacheWriteTokens ?? '-'} | ${sum(steps.map((step) => step.cacheReadTokens ?? 0))} | ${sum(steps.map((step) => step.cacheWriteTokens ?? 0))} | ${usd(cost)} | ${error ?? ''} |`;
  });
  const all = records.flatMap(({ steps }) => steps);
  return [
    `# Cross-minute cache measurement, ${at}`,
    '',
    `Model \`${MODEL}\` on the Anthropic API, \`breakpoints\` caching. ${records.length} requests of "${MESSAGE}", each one minute later and by another User. Started ${startedAt}, ended ${endedAt}.`,
    '',
    '| # | User | now | Steps | First call input | First call cache read | First call cache write | Cache read | Cache write | Cost USD | Error |',
    '| - | ---- | --- | ----- | ---------------- | --------------------- | ---------------------- | ---------- | ----------- | -------- | ----- |',
    ...rows,
    '',
    `Total: input ${sum(all.map((step) => step.inputTokens ?? 0))}, cache read ${sum(all.map((step) => step.cacheReadTokens ?? 0))}, cache write ${sum(all.map((step) => step.cacheWriteTokens ?? 0))}, output ${sum(all.map((step) => step.outputTokens ?? 0))}, cost USD ${usd(sum(records.map(({ cost }) => cost)))}.`,
    '',
  ].join('\n');
}

function saved(at: string, startedAt: string, records: RequestRecord[]): string {
  const endedAt = new Date().toISOString();
  mkdirSync(RESULTS, { recursive: true });
  const name = `cross-minute-cache-${at}`;
  writeFileSync(
    new URL(`${name}.json`, RESULTS),
    `${JSON.stringify({ commit: at, model: MODEL, message: MESSAGE, startedAt, endedAt, records }, null, 2)}\n`,
  );
  const markdown = markdownOf(at, startedAt, endedAt, records);
  writeFileSync(new URL(`${name}.md`, RESULTS), markdown);
  return markdown;
}

describe('The chat cache across minutes and Users', () => {
  it('records each request', async () => {
    const key = dotEnv()[EVAL_KEYS.anthropic] ?? '';
    if (process.env.CROSS_MINUTE_YES !== '1' || key === '') {
      throw new Error(`Set CROSS_MINUTE_YES=1 and ${EVAL_KEYS.anthropic} in main-server/.env to call the model.`);
    }
    const count = Number(process.env.CROSS_MINUTE_N ?? '10');
    const model = anthropicModel(key, MODEL, 'breakpoints');
    const all = { drawsAnswers: true, drawsEvents: true, drawsMeets: true, drawsArea: true };
    const feature = chatAssistant(await chatServicesWithoutData(), all);
    const at = commit();
    const startedAt = new Date().toISOString();
    const records: RequestRecord[] = [];
    for (let index = 0; index < count; index += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one request after another, so that each can read what the last wrote
      records.push(await sent(model, feature, index));
    }
    console.log(saved(at, startedAt, records));
    expect(records).toHaveLength(count);
  });
});
