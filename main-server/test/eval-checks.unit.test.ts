/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { caseSchema } from '../eval/cases.ts';
import { expectSchema } from '../eval/expect.ts';
import { scoreTurn } from '../eval/score.ts';
import { type TurnTrace } from '../eval/trace.ts';
import {
  call,
  diningShown,
  expectOf,
  menusExpect,
  menusFound,
  names,
  proposal,
  proposed,
  QUEST,
  turn,
} from './eval-traces.ts';

// The checks of a scored turn (P19 ticket 02) on hand-made traces, and the validation of `expect`. No app, no model.

function failedChecks(trace: TurnTrace, written: unknown): string[] {
  return scoreTurn(trace, expectOf(written), names)
    .checks.filter(({ passed }) => !passed)
    .map(({ name }) => name);
}

function shuttleCall(): ReturnType<typeof call> {
  return call('getShuttle', {}, { result: 'found' });
}

describe('The tools called', () => {
  it('fail on a required tool not called, counted as under-calling', () => {
    const score = scoreTurn(turn({ steps: [[menusFound]], text: '제육볶음' }), menusExpect, names);

    expect(score.underCalls).toEqual(['showOnMap']);
    expect(score.checks.find(({ name }) => name === 'tools.required')?.passed).toBe(false);
  });

  it('count a call outside required and allowed as over-calling without failing', () => {
    const shuttle = call('getShuttle', {}, { result: 'found' });
    const score = scoreTurn(
      turn({ steps: [[menusFound, shuttle], [diningShown]], text: '제육볶음', mapButtons: ['dining'] }),
      menusExpect,
      names,
    );

    expect(score.overCalls).toEqual(['getShuttle']);
    expect(score.passed).toBe(true);
  });

  it('count every call outside required and allowed, not each tool once', () => {
    const score = scoreTurn(
      turn({
        steps: [
          [menusFound, shuttleCall()],
          [shuttleCall(), diningShown],
        ],
        text: '제육볶음',
        mapButtons: ['dining'],
      }),
      menusExpect,
      names,
    );

    // Each call once: the second is outside and a repeat, counted as outside.
    expect(score.overCalls).toEqual(['getShuttle', 'getShuttle']);
  });
});

describe('The tools forbidden or repeated', () => {
  it('fail on a forbidden tool, which is over-calling too', () => {
    const refused = call('proposeQuest', {}, { result: 'refused' });
    const score = scoreTurn(
      turn({ steps: [[menusFound, refused], [diningShown]], text: '제육볶음', mapButtons: ['dining'] }),
      menusExpect,
      names,
    );

    expect(score.overCalls).toEqual(['proposeQuest']);
    expect(score.passed).toBe(false);
  });

  it('fail on any tool when "*" is forbidden', () => {
    expect(
      failedChecks(turn({ steps: [[menusFound]], text: '네' }), { actions: ['CHAT'], tools: { forbidden: '*' } }),
    ).toEqual(expect.arrayContaining(['tools.forbidden']));
  });

  it('count the same call repeated with the same arguments, after normalising, as over-calling', () => {
    const again = call('getMenus', { date: '2026-10-21T00:00:00+09:00', meal: 'lunch' }, { result: 'found' });
    const score = scoreTurn(
      turn({ steps: [[menusFound], [again], [diningShown]], text: '제육볶음', mapButtons: ['dining'] }),
      menusExpect,
      names,
    );

    expect(score.overCalls).toEqual(['getMenus (repeated)']);
  });
});

describe('The arguments', () => {
  it('fail when they do not match after normalising, the expectations matched counted', () => {
    const tomorrow = call('getMenus', { date: '2026-10-22', meal: 'lunch' }, { result: 'found' });
    const score = scoreTurn(
      turn({ steps: [[tomorrow], [diningShown]], text: '제육볶음', mapButtons: ['dining'] }),
      menusExpect,
      names,
    );

    expect(score.args).toEqual({ expected: 1, matched: 0 });
    expect(score.checks.find(({ name }) => name === 'args')?.passed).toBe(false);
  });

  it("need a call for each when a tool's are a list", () => {
    const week = expectOf({
      actions: ['TOOL'],
      tools: { required: ['getMenus'] },
      args: { getMenus: [{ date: '2026-10-21' }, { date: '2026-10-22' }] },
    });
    const today = call('getMenus', { date: '2026-10-21' }, { result: 'found' });
    const tomorrow = call('getMenus', { date: '2026-10-22' }, { result: 'found' });

    expect(scoreTurn(turn({ steps: [[today, tomorrow]], text: '메뉴' }), week, names).args).toEqual({
      expected: 2,
      matched: 2,
    });
    expect(scoreTurn(turn({ steps: [[today]], text: '메뉴' }), week, names).args).toEqual({ expected: 2, matched: 1 });
  });
});

describe('The Proposal', () => {
  const trace = turn({ steps: [[proposed]], text: '만들까요?', proposal });

  it("passes on the expected fields, read by seed name and in Korea's time", () => {
    const expected = { startsAt: '2026-10-22 19:00', place: '학생회관', invitees: ['이민수'], joinPolicy: 'closed' };

    expect(failedChecks(trace, { actions: ['PROPOSE'], proposal: expected })).toEqual([]);
  });

  it('fails on a field that differs', () => {
    expect(failedChecks(trace, { actions: ['PROPOSE'], proposal: { startsAt: '2026-10-22T07:00:00+09:00' } })).toEqual([
      'proposal',
    ]);
  });
});

describe('The cards', () => {
  const cards = [
    { kind: 'quest', quest: { id: QUEST, title: '농구 파티' } },
    { kind: 'quest', quest: { id: 'x', title: '배드민턴' } },
  ];
  const trace = turn({
    steps: [[call('showQuests', { ids: [QUEST, 'x'] }, { result: 'shown' })]],
    text: '찾았어요',
    cards,
  });

  it('pass with the seeds shown within the limits', () => {
    expect(
      failedChecks(trace, { actions: ['TOOL'], cards: [{ kind: 'quest', seeds: ['농구 파티'], max: 3 }] }),
    ).toEqual([]);
  });

  it('fail on more or fewer of a kind than the limits, or a seed not shown', () => {
    expect(failedChecks(trace, { actions: ['TOOL'], cards: [{ kind: 'quest', max: 1 }] })).toEqual(['cards']);
    expect(failedChecks(trace, { actions: ['TOOL'], cards: [{ kind: 'globalEvent', min: 1 }] })).toEqual(['cards']);
    expect(failedChecks(trace, { actions: ['TOOL'], cards: [{ kind: 'quest', seeds: ['축구 파티'] }] })).toEqual([
      'cards',
    ]);
  });
});

describe('The map buttons and the text', () => {
  it('fail on map buttons other than those expected', () => {
    const trace = turn({ steps: [[menusFound], [diningShown]], text: '제육볶음', mapButtons: ['dining', 'shuttle'] });

    expect(failedChecks(trace, { actions: ['TOOL'], mapButtons: ['dining'] })).toEqual(['mapButtons']);
  });

  it('fail on a mention missing, each a word or any one of a list, spaces aside', () => {
    const trace = turn({ text: '몇명이서 가실 건가요? 오전인가요?' });

    expect(
      failedChecks(trace, {
        actions: ['ASK'],
        text: {
          mentions: [
            ['몇 명', '인원'],
            ['오전', '아침'],
          ],
        },
      }),
    ).toEqual([]);
    expect(failedChecks(trace, { actions: ['ASK'], text: { mentions: [['몇 명', '인원'], '장소'] } })).toEqual([
      'action',
      'text.mentions',
    ]);
  });

  it('do not match a word that starts with a digit inside a longer number', () => {
    const trace = turn({ text: '12시 15분까지 18개 있어요.' });

    expect(failedChecks(trace, { actions: ['ASK'], text: { mentions: ['2시', '8개'] } })).toEqual([
      'action',
      'text.mentions',
    ]);
    expect(failedChecks(trace, { actions: ['ASK'], text: { mentions: ['12시', '15분', '18개'] } })).toEqual([]);
  });
});

describe('The words the text must not hold', () => {
  const trace = turn({ steps: [[menusFound]], text: '이민수, 김 지은 님이 돼요.' });

  it('fail when one is there, spaces aside', () => {
    expect(failedChecks(trace, { actions: ['TOOL'], text: { absent: ['김지은'] } })).toEqual(['text.absent']);
  });

  it('pass on a word that starts with a digit inside a longer number', () => {
    expect(
      failedChecks(turn({ steps: [[menusFound]], text: '116동이에요.' }), {
        actions: ['TOOL'],
        text: { absent: ['16동'] },
      }),
    ).toEqual([]);
  });

  it('pass when none is, with no mentions asked', () => {
    expect(failedChecks(trace, { actions: ['TOOL'], text: { absent: ['오지호'] } })).toEqual([]);
  });

  it('do not stand in for the mentions that say a lookup found nothing', () => {
    const none = call('getMenus', {}, { result: 'none', reason: '메뉴가 없어요' });

    expect(
      failedChecks(turn({ steps: [[none]], text: '없어요' }), { actions: ['TOOL'], text: { absent: ['x'] } }),
    ).toEqual(['action']);
  });
});

describe('An expectation', () => {
  it.each([
    { actions: [] },
    { actions: ['LOOKUP'] },
    { actions: ['ASK'] },
    { actions: ['TOOL'], tools: { required: ['getMenus'], forbidden: ['getMenus'] } },
    { actions: ['TOOL'], tools: { required: ['getMenus'], forbidden: '*' } },
    { actions: ['TOOL'], args: { getMenus: { date: '2026-10-21' } } },
    { actions: ['TOOL'], cards: [{ kind: 'quest', min: 3, max: 1 }] },
    { actions: ['TOOL'], mapButtons: ['library'] },
    { actions: ['TOOL'], text: { mentions: [[]] } },
    { actions: ['TOOL'], text: {} },
    { actions: ['TOOL'], text: { absent: [] } },
    { actions: ['ASK'], text: { absent: ['오지호'] } },
    { actions: ['TOOL'], unknown: 1 },
  ])('is refused when it is %j', (wrong) => {
    expect(expectSchema.safeParse(wrong).success).toBe(false);
  });

  it('is validated with its case, which gives knownFailure once at most', () => {
    const base = { id: 'a-case', category: 'menus', turns: [{ user: '가' }] };

    expect(caseSchema.safeParse({ ...base, expect: { actions: ['ASK'] } }).success).toBe(false);
    expect(
      caseSchema.safeParse({ ...base, knownFailure: 'a', expect: { actions: ['TOOL'], knownFailure: 'b' } }).success,
    ).toBe(false);
    expect(caseSchema.safeParse({ ...base, expect: { actions: ['TOOL'], knownFailure: 'b' } }).success).toBe(true);
  });
});
