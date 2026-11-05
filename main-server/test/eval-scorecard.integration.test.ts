/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FALLBACK_PRICES } from '../eval/cost.ts';
import { expectSchema } from '../eval/expect.ts';
import { type CaseRun } from '../eval/runner.ts';
import { compare } from '../eval/compare.ts';
import { scoreRun } from '../eval/run-score.ts';
import { saveScorecard, scorecard } from '../eval/scorecard.ts';
import { type TurnTrace } from '../eval/trace.ts';

// The benchmark's scorecard and comparison (P19 ticket 02), from hand-made saved runs. No app, no model.

const OPTIONS = {
  model: 'test/model',
  temperature: null,
  topP: null,
  maxSteps: 8,
  timeoutMs: 30_000,
  maxOutputTokens: 1000,
  repeat: null,
  categories: [],
  caseIds: [],
  budgetUsd: 5,
  prices: FALLBACK_PRICES,
  commit: 'abc1234',
};

function trace(
  text: string,
  toolCalls: TurnTrace['steps'][number]['toolCalls'] = [],
  mapButtons: string[] = [],
): TurnTrace {
  return {
    user: '질문',
    status: 200,
    latencyMs: 1200,
    steps: [
      {
        toolCalls,
        text,
        finishReason: 'stop',
        usage: { inputTokens: 2000, outputTokens: 100, cacheReadTokens: 500, cacheWriteTokens: 0 },
        latencyMs: 1200,
        ended: true,
      },
    ],
    reply: { text, textLength: text.length, cards: [], mapButtons, proposal: null },
    failure: null,
    errorBody: null,
  };
}

const failed: TurnTrace = {
  user: '이번 주 메뉴랑 셔틀',
  status: 503,
  latencyMs: 30_000,
  steps: [
    {
      toolCalls: [{ id: '1', name: 'getMenus', input: { date: '2026-10-21' }, result: { result: 'found' } }],
      text: '',
      finishReason: 'tool-calls',
      usage: null,
      latencyMs: 30_000,
      ended: true,
    },
  ],
  reply: null,
  failure: 'STEP_LIMIT',
  errorBody: { message: 'unavailable' },
};

const menus = expectSchema.parse({
  actions: ['TOOL'],
  tools: { required: ['getMenus'] },
  mapButtons: ['dining'],
  text: { mentions: ['제육볶음'] },
});
const chat = expectSchema.parse({ actions: ['CHAT'], tools: { forbidden: '*' } });

const menusCall = { id: 'm', name: 'getMenus', input: { date: '2026-10-21' }, result: { result: 'found' } };

function caseRun(
  id: string,
  category: string,
  expect: unknown,
  turns: TurnTrace[],
  knownFailure: string | null = null,
): CaseRun {
  return { id, category, kind: 'single', repetition: 1, knownFailure, expect, turnExpects: [null], turns };
}

function savedRun(name: string, cases: CaseRun[], options: object = OPTIONS): object {
  return { name, options, seeds: {}, stoppedBy: null, cases };
}

const before = savedRun('before', [
  caseRun('menus-a', 'menus', menus, [trace('제육볶음이에요.', [menusCall], ['dining'])]),
  caseRun('menus-b', 'menus', menus, [failed]),
  caseRun('chat-a', 'small-talk', chat, [trace('안녕하세요! 무엇을 도와드릴까요?')]),
  caseRun('menus-known', 'menus', menus, [trace('제육볶음이에요.', [menusCall], ['dining'])], '학관'),
]);

describe('The scorecard', () => {
  const card = scorecard(scoreRun(before));

  it('heads with action recall per kind, known failures included', () => {
    expect(card).toMatch(/## Action recall[\s\S]*\| TOOL \| 3 \| 2 \| 66\.7% \|/u);
    expect(card).toMatch(/\| CHAT \| 1 \| 1 \| 100\.0% \|/u);
  });

  it('gives tool selection, argument accuracy, over- and under-calling', () => {
    expect(card).toContain('| Tool selection accuracy | 4/4 (100.0%) |');
    expect(card).toContain('| Over-calling |');
    expect(card).toContain('| Under-calling |');
  });

  it('gives the pass rate per category with known failures apart, the failure kinds, and those that now pass', () => {
    expect(card).toContain('| menus | 1/2 (50.0%) | 1/1 | 1 | 0 | 0 |');
    expect(card).toMatch(/now pass[\s\S]*- menus-known: 학관/u);
  });

  it('gives the settings, the averages, the tokens and the estimated cost', () => {
    expect(card).toContain('test/model');
    expect(card).toContain('abc1234');
    expect(card).toMatch(/\| 4 \| 1\.00 \| 8\.4 s \| 6,000 \| 1,500 \| 0 \| 300 \| USD 0\.0\d+ \|/u);
    // Per turn: the tokens and the cost of one request beside the accuracy.
    expect(card).toMatch(/\| 1,500 \| 375 \| 0 \| 75 \| USD 0\.0\d+ \|/u);
  });

  it('lists each failed case with its trace', () => {
    expect(card).toMatch(
      /## Failed cases[\s\S]*### menus-b \(menus\)[\s\S]*STEP_LIMIT[\s\S]*getMenus `\{"date":"2026-10-21"\}` → found/u,
    );
  });

  it('gives the full text and length of every reply in a REFUSE, CHAT or ambiguous-intent case', () => {
    expect(card).toMatch(
      /## Replies to review[\s\S]*### chat-a[\s\S]*> 안녕하세요! 무엇을 도와드릴까요\?[\s\S]*18 characters/u,
    );
  });
});

describe('The replies to review', () => {
  it('are those of the ambiguous-intent category, by category, and of cases accepting REFUSE or CHAT', () => {
    const ambiguous = expectSchema.parse({ actions: ['TOOL+ASK'], text: { mentions: ['약속'] } });
    const card = scorecard(
      scoreRun(
        savedRun('review', [
          caseRun('ambiguous-a', 'ambiguous-intent', ambiguous, [trace('약속 잡아 드릴까요', [menusCall], ['dining'])]),
          caseRun('menus-c', 'menus', ambiguous, [trace('약속도 잡을까요', [menusCall], ['dining'])]),
          caseRun('chat-b', 'small-talk', chat, [trace('안녕하세요!')]),
        ]),
      ),
    );
    const replies = card.slice(card.indexOf('## Replies to review'));

    expect(replies).toContain('### ambiguous-a');
    expect(replies).toContain('### chat-b');
    expect(replies).not.toContain('menus-c');
  });
});

describe('A saved run', () => {
  it('is scored again on its own, the scorecard written beside it', () => {
    const directory = mkdtempSync(join(tmpdir(), 'eval-score-'));
    const file = pathToFileURL(join(directory, 'run.json'));
    writeFileSync(file, JSON.stringify(before));

    const written = saveScorecard(file);

    expect(written.href).toBe(pathToFileURL(join(directory, 'run.md')).href);
    expect(readFileSync(written, 'utf8')).toBe(scorecard(scoreRun(before)));
  });
});

describe('Two runs compared', () => {
  const after = savedRun(
    'after',
    [
      caseRun('menus-a', 'menus', menus, [trace('메뉴를 볼 수 없어요.')]),
      caseRun('menus-b', 'menus', menus, [trace('제육볶음이에요.', [menusCall], ['dining'])]),
      caseRun('chat-a', 'small-talk', chat, [trace('안녕하세요!')]),
      caseRun('menus-known', 'menus', menus, [failed], '학관'),
    ],
    { ...OPTIONS, maxSteps: 30, timeoutMs: 60_000 },
  );
  const shown = compare(scoreRun(before), scoreRun(after));

  it('shows the two side by side with the differences', () => {
    expect(shown).toContain('| Measure | before | after | Difference |');
    expect(shown).toMatch(/\| Pass rate, menus \| 1\/2 \(50\.0%\) \| 1\/2 \(50\.0%\) \| \+0\.0 pp \|/u);
    expect(shown).toMatch(/\| STEP_LIMIT \| 1 \| 1 \| \+0 \|/u);
  });

  it('shows the settings that differ', () => {
    expect(shown).toMatch(/\| maxSteps \| 8 \| 30 \|/u);
    expect(shown).not.toMatch(/\| model \|/u);
  });

  it('puts the two runs as points of the cost-accuracy plane, with the model and the cost per turn', () => {
    expect(shown).toContain(
      '| Run | Model | Pass rate | pass^k | Cost per turn | Tokens in per turn | Tokens out per turn |',
    );
    expect(shown).toMatch(/\| before \| test\/model \| \d\/\d \(\d+\.\d%\) \| — \| USD 0\.0\d+ \| [\d,]+ \| \d+ \|/u);
    expect(shown).toMatch(/\| Cost per turn \| USD 0\.0\d+ \| USD 0\.0\d+ \| /u);
  });

  it('lists the regressions and the fixed cases, and the known failures apart, never as regressions', () => {
    expect(shown).toMatch(/Regressions[\s\S]*- menus-a/u);
    expect(shown).toMatch(/Fixed[\s\S]*- menus-b/u);
    expect(shown).toMatch(/Known failures changed[\s\S]*- menus-known: passed, now fails/u);
    expect(shown.slice(shown.indexOf('Regressions'), shown.indexOf('Fixed'))).not.toContain('menus-known');
  });
});
