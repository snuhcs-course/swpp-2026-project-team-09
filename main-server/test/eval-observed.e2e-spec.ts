/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { asksBack, observedActionOf } from '../eval/observed.ts';
import { scoreRun } from '../eval/run-score.ts';
import { scorecard } from '../eval/scorecard.ts';
import {
  call,
  caseRun,
  diningShown,
  expectOf,
  goodMenus,
  menusFound,
  minsuSeveral,
  proposal,
  proposed,
  savedRun,
  turn,
} from './eval-traces.ts';

// The observed action of a turn (P19 ticket 02, review by 함재현): read without the case's expect, for diagnosis only,
// and the confusion table of expected and observed actions. No app, no model.

describe('Asking back', () => {
  it.each([
    '누구랑 가실 건가요?',
    '점심 약속을 잡아 드릴까요',
    '몇 시로 할래요',
    '같이 갈 친구를 알려 주세요.',
    '장소를 정해 주세요',
    '7시는 어떠세요',
  ])('is read from the last sentence: %s', (text) => {
    expect(asksBack(`메뉴를 찾았어요. ${text}`)).toBe(true);
  });

  it.each(['제육볶음이에요.', '혹시 다른 메뉴가 궁금하세요? 오늘은 제육볶음이에요.', ''])(
    'is not read when the last sentence does not ask: %j',
    (text) => {
      expect(asksBack(text)).toBe(false);
    },
  );
});

describe('The observed action', () => {
  it('is TOOL, TOOL+ASK, PROPOSE or PROPOSE+ASK by what the reply holds and its last sentence', () => {
    expect(observedActionOf(goodMenus)).toBe('TOOL');
    expect(observedActionOf(turn({ steps: [[menusFound]], text: '제육볶음이에요. 약속도 잡을까요?' }))).toBe(
      'TOOL+ASK',
    );
    expect(observedActionOf(turn({ steps: [[proposed]], text: '만들었어요.', proposal }))).toBe('PROPOSE');
    expect(observedActionOf(turn({ steps: [[proposed]], text: '오전 7시였나요?', proposal }))).toBe('PROPOSE+ASK');
  });

  it('is ASK by a cue or by the trace, whatever the case says', () => {
    expect(observedActionOf(turn({ text: '누구랑 가실 건가요?' }))).toBe('ASK');
    expect(observedActionOf(turn({ steps: [[minsuSeveral]], text: '민수 님이 두 분 있어요.' }))).toBe('ASK');
  });

  it('is NO_TOOL for a reply with no tool and no question, REFUSE and CHAT alike, and NONE otherwise', () => {
    expect(observedActionOf(turn({ text: '그건 도와드릴 수 없어요.' }))).toBe('NO_TOOL');
    const resolved = call('resolvePlace', { words: '301동' }, { result: 'one', candidate: {} });
    expect(observedActionOf(turn({ steps: [[resolved]], text: '알겠어요.' }))).toBe('NONE');
  });

  it('is the failure kind of a turn that failed', () => {
    expect(observedActionOf(turn({ failure: 'TIMEOUT' }))).toBe('TIMEOUT');
  });
});

describe('The confusion table', () => {
  const ask = expectOf({ actions: ['ASK', 'TOOL+ASK'], text: { mentions: ['이민수'] } });
  const run = scoreRun(
    savedRun([
      caseRun({ turns: [goodMenus] }),
      caseRun({
        id: 'b',
        turns: [turn({ steps: [[menusFound], [diningShown]], text: '약속도 잡을까요?', mapButtons: ['dining'] })],
      }),
      caseRun({ id: 'c', category: 'ask', expect: ask, turns: [turn({ steps: [[minsuSeveral]], text: '이민수?' })] }),
    ]),
  );

  it('counts the observed actions by the actions each case accepts', () => {
    expect(run.confusion).toEqual([
      { expected: 'TOOL', observed: { TOOL: 1, 'TOOL+ASK': 1 } },
      { expected: 'ASK or TOOL+ASK', observed: { ASK: 1 } },
    ]);
  });

  it('is in the scorecard, a column per observed action', () => {
    expect(scorecard(run)).toMatch(
      /## Expected and observed actions[\s\S]*\| Expected \| TOOL \| TOOL\+ASK \| ASK \|\n[^\n]*\n\| TOOL \| 1 \| 1 \| 0 \|\n\| ASK or TOOL\+ASK \| 0 \| 0 \| 1 \|/u,
    );
  });
});
