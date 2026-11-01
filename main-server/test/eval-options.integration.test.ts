/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  caseSchema,
  casesIn,
  CASES_DIRECTORY,
  type EvalCase,
  loadCases,
  nowOf,
  repetitionsOf,
  selectCases,
  sentTurnsOf,
} from '../eval/cases.ts';
import { costOf, FALLBACK_PRICES } from '../eval/cost.ts';
import { parseFlags, type RunOptions, runName } from '../eval/options.ts';
import { type CaseRun, RunLog } from '../eval/runner.ts';
import { failureOf, type StepTrace } from '../eval/trace.ts';

// The benchmark's command line, case files, failure kinds and cost guard (P19 ticket 01), without the app or a model.

describe('The command line, from the settings', () => {
  it("takes each value left out from the branch's settings: .env, else the settings' defaults", () => {
    const { options, yes } = parseFlags([], {
      ASSISTANT_MODEL: 'anthropic/claude-haiku-5.5',
      ASSISTANT_MAX_STEPS: '30',
    });

    expect(options).toEqual({
      model: 'anthropic/claude-haiku-5.5',
      temperature: null,
      topP: null,
      maxSteps: 30,
      timeoutMs: 30_000,
      maxOutputTokens: 1000,
      repeat: null,
      categories: [],
      caseIds: [],
      budgetUsd: 5,
      world: 'small',
    });
    expect(yes).toBe(false);
  });
});

describe('The command line, from the flags', () => {
  it('takes every hyperparameter, the selection and the budget', () => {
    const { options, yes } = parseFlags(
      // prettier-ignore
      [
        '--model', 'openai/gpt-x', '--temperature', '0.2', '--top-p', '0.9', '--max-steps', '30',
        '--timeout', '60000', '--max-output-tokens', '2000', '--repeat', '5', '--budget', '1.5',
        '--category', 'menus,shuttle', '--category', 'small-talk', '--case', 'menus-today-lunch', '--yes',
        '--world', 'p4',
      ],
      { ASSISTANT_MODEL: 'anthropic/claude-haiku-5.5' },
    );

    expect(options).toEqual({
      model: 'openai/gpt-x',
      temperature: 0.2,
      topP: 0.9,
      maxSteps: 30,
      timeoutMs: 60_000,
      maxOutputTokens: 2000,
      repeat: 5,
      categories: ['menus', 'shuttle', 'small-talk'],
      caseIds: ['menus-today-lunch'],
      budgetUsd: 1.5,
      world: 'p4',
    });
    expect(yes).toBe(true);
  });

  it.each([
    [['--temperature', 'hot']],
    [['--max-steps', '0']],
    [['--top-p', '1.5']],
    [['--unknown']],
    [['--world', 'large']],
  ])('refuses %j', (argv) => {
    expect(() => parseFlags(argv, { ASSISTANT_MODEL: 'a/b' })).toThrow();
  });

  it('refuses a run with no model', () => {
    expect(() => parseFlags([], {})).toThrow();
  });
});

const single = (id: string, category: string, repeat?: number): EvalCase =>
  caseSchema.parse({ id, category, repeat, turns: [{ user: '안녕' }] });

describe('The cases', () => {
  it('load from eval/cases/ against the schema', () => {
    expect(loadCases().map(({ id }) => id)).toContain('menus-today-lunch');
  });

  it.each([
    ['ends with the Assistant', { turns: [{ user: '안녕' }, { assistant: { text: '네' } }] }],
    ['is live with an Assistant turn', { live: true, turns: [{ assistant: { text: '네' } }, { user: '안녕' }] }],
    ['has an id in other words', { id: 'Menus Today', turns: [{ user: '안녕' }] }],
    ['names a world there is not', { world: 'large', turns: [{ user: '안녕' }] }],
    ['gives a time with no offset', { now: '2026-11-02T12:40:00', turns: [{ user: '안녕' }] }],
    [
      'names a card of an unknown kind',
      { turns: [{ assistant: { text: '네', cards: [{ kind: 'place', seed: '학생회관' }] } }, { user: '안녕' }] },
    ],
  ])('refuse a case that %s', (_, changes) => {
    expect(caseSchema.safeParse({ id: 'a-case', category: 'menus', ...changes }).success).toBe(false);
  });
});

describe('The cases of a world', () => {
  const cases = [single('a', 'menus'), single('b', 'menus', 3), single('c', 'shuttle')];

  it('run in the world they name, the small one unless they name another', () => {
    const named = caseSchema.parse({ id: 'p', category: 'menus', world: 'p4', turns: [{ user: '안녕' }] });

    expect(casesIn([...cases, named], 'p4')).toEqual([named]);
    expect(casesIn([...cases, named], 'small')).toEqual(cases);
  });

  it("run at their own time, else at their world's clock", () => {
    const written = { id: 'p', category: 'menus', turns: [{ user: '안녕' }] };

    expect(nowOf(caseSchema.parse(written))).toBe('2026-10-21T14:05:00+09:00');
    expect(nowOf(caseSchema.parse({ ...written, world: 'p4' }))).toBe('2026-11-02T11:30:00+09:00');
    expect(nowOf(caseSchema.parse({ ...written, world: 'p4', now: '2026-11-02T12:40:00+09:00' }))).toBe(
      '2026-11-02T12:40:00+09:00',
    );
  });

  it('refuse an id used twice, across the case directories', () => {
    expect(() => loadCases([CASES_DIRECTORY, CASES_DIRECTORY])).toThrow('used twice');
  });
});

describe('The cases chosen', () => {
  const cases = [single('a', 'menus'), single('b', 'menus', 3), single('c', 'shuttle')];

  it('are chosen by category or by id, all when neither is given', () => {
    expect(selectCases(cases, [], []).map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(selectCases(cases, ['menus'], []).map(({ id }) => id)).toEqual(['a', 'b']);
    expect(selectCases(cases, ['shuttle'], ['a']).map(({ id }) => id)).toEqual(['a', 'c']);
  });

  it('refuse a category or an id that no case has', () => {
    expect(() => selectCases(cases, ['menu'], [])).toThrow('menu');
    expect(() => selectCases(cases, [], ['d'])).toThrow('d');
  });

  it('run once, or the repeated set its own count unless --repeat gives another', () => {
    expect(cases.map((evalCase) => repetitionsOf(evalCase, null))).toEqual([1, 3, 1]);
    expect(cases.map((evalCase) => repetitionsOf(evalCase, 5))).toEqual([1, 5, 1]);
  });

  it("send one turn, or each of a live case's", () => {
    const live = caseSchema.parse({ id: 'l', category: 'live', live: true, turns: [{ user: '가' }, { user: '나' }] });

    expect([sentTurnsOf(single('s', 'menus')), sentTurnsOf(live)]).toEqual([1, 2]);
  });
});

const step = (finishReason: string | null, error?: string): StepTrace => ({
  toolCalls: [],
  text: '',
  finishReason,
  usage: null,
  latencyMs: 10,
  ended: error === undefined,
  ...(error === undefined ? {} : { error }),
});

describe('A failed turn is classified', () => {
  const limits = { maxSteps: 3, timeoutMs: 1000 };

  it.each<[string, number, StepTrace[], number, string | null]>([
    ['answered', 200, [step('stop')], 100, null],
    [
      'the step cap ended on tool calls',
      503,
      [step('tool-calls'), step('tool-calls'), step('tool-calls')],
      100,
      'STEP_LIMIT',
    ],
    [
      'the step cap ended on tool calls that never returned, the time running out',
      503,
      [step('tool-calls'), step('tool-calls'), { ...step('tool-calls'), ended: false }],
      1000,
      'TIMEOUT',
    ],
    ['a call was aborted by the time', 503, [step('tool-calls'), step(null, 'TimeoutError')], 1000, 'TIMEOUT'],
    ['the time ran out between calls', 503, [step('tool-calls')], 1200, 'TIMEOUT'],
    ['the provider failed', 503, [step(null, 'APICallError: HTTP 500')], 100, 'ERROR'],
    ['the model answered nothing', 503, [step('stop')], 100, 'ERROR'],
    ['the request was refused', 400, [], 10, 'ERROR'],
  ])('when %s', (_, status, steps, latencyMs, failure) => {
    expect(failureOf(status, steps, latencyMs, limits)).toBe(failure);
  });
});

const OPTIONS: RunOptions = {
  model: 'anthropic/claude-haiku-5.5',
  temperature: null,
  topP: 0.9,
  maxSteps: 8,
  timeoutMs: 30_000,
  maxOutputTokens: 1000,
  repeat: null,
  categories: [],
  caseIds: [],
  budgetUsd: 0.01,
  world: 'small',
  prices: FALLBACK_PRICES,
  commit: 'abc1234',
};

function caseRun(inputTokens: number, outputTokens: number): CaseRun {
  return {
    id: 'a',
    category: 'menus',
    kind: 'single',
    repetition: 1,
    knownFailure: null,
    expect: null,
    turnExpects: [null],
    turns: [
      {
        user: '안녕',
        status: 200,
        latencyMs: 100,
        steps: [{ ...step('stop'), usage: { inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: null } }],
        reply: { text: '네', textLength: 1, mapButtons: [], cards: [], proposal: null },
        failure: null,
        errorBody: null,
      },
    ],
  };
}

// Keeps a case run as the benchmark does, its turns counted first.
function record(log: RunLog, run: CaseRun): void {
  for (const turn of run.turns) {
    log.countTurn(turn);
  }
  log.add(run);
}

describe('A run', () => {
  it('costs its tokens at the prices, cache reads and writes at their own', () => {
    const prices = { input: 1, output: 10, cacheRead: 0.1, cacheWrite: 2, source: 'fallback' } as const;

    expect(costOf({ inputTokens: 100, outputTokens: 5, cacheReadTokens: 50, cacheWriteTokens: 10 }, prices)).toBe(
      40 + 5 + 20 + 50,
    );
  });

  it('stops once its estimated cost passes the budget', () => {
    const log = new RunLog(OPTIONS);

    record(log, caseRun(1000, 100));
    expect(log.overBudget()).toBe(false);
    record(log, caseRun(1000, 100));
    expect(log.overBudget()).toBe(true);
  });

  it('is saved as JSON named by date, commit, model and settings, with every turn', () => {
    const directory = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'eval-'))}/`);
    const log = new RunLog(OPTIONS);
    record(log, caseRun(1000, 100));

    const [first, second] = [log.save(directory), log.save(directory)];

    const name = runName(OPTIONS, new Date());
    expect(name).toMatch(
      /^\d{4}-\d{2}-\d{2}-abc1234-anthropic_claude-haiku-5\.5-s8-t30000-o1000-tempdefault-topp0\.9$/u,
    );
    expect(readdirSync(directory).toSorted()).toEqual([`${name}-2.json`, `${name}.json`]);
    expect(second.href).toContain('-2.json');
    const saved: unknown = JSON.parse(readFileSync(first, 'utf8'));
    expect(saved).toMatchObject({
      options: OPTIONS,
      stoppedBy: null,
      totals: { cases: 1, turns: 1, tokens: { inputTokens: 1000, outputTokens: 100 } },
      cases: [{ id: 'a', turns: [{ reply: { text: '네' } }] }],
    });
  });
});
