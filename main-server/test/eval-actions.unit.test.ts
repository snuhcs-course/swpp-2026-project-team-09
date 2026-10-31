/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { observedActionOf } from '../eval/observed.ts';
import { scoreTurn } from '../eval/score.ts';
import {
  call,
  diningShown,
  expectOf,
  menusExpect,
  menusFound,
  minsuSeveral,
  names,
  proposal,
  proposed,
  turn,
} from './eval-traces.ts';

// The action the benchmark's scorer reads from a turn (P19 ticket 02), on hand-made traces: each kind and each
// combination. No app, no model.

describe('A TOOL turn', () => {
  it('is one where a lookup answered and the reply shows it', () => {
    const score = scoreTurn(
      turn({ steps: [[menusFound], [diningShown]], text: '오늘 점심은 제육볶음이에요.', mapButtons: ['dining'] }),
      menusExpect,
      names,
    );

    expect(score).toMatchObject({ action: 'TOOL', passed: true });
  });

  it('is one where a lookup found nothing and the text says so', () => {
    const none = call('getMenus', { date: '2026-10-25' }, { result: 'none', reason: 'No menu' });
    const noData = expectOf({
      actions: ['TOOL'],
      tools: { required: ['getMenus'] },
      text: { mentions: [['없어요', '없습니다']] },
    });

    expect(scoreTurn(turn({ steps: [[none]], text: '그날 메뉴는 없어요.' }), noData, names).action).toBe('TOOL');
    expect(scoreTurn(turn({ steps: [[none]], text: '메뉴를 찾아볼게요.' }), noData, names).action).toBeNull();
  });

  it('is not an ASK when it ends with a courtesy question', () => {
    const score = scoreTurn(
      turn({
        steps: [[menusFound], [diningShown]],
        text: '오늘 점심은 제육볶음이에요. 더 궁금한 거 있으세요?',
        mapButtons: ['dining'],
      }),
      menusExpect,
      names,
    );

    expect(score.action).toBe('TOOL');
  });
});

describe('A TOOL turn answered in words', () => {
  it('is one where a lookup found data and the text answers, the missing button failing its own check', () => {
    const score = scoreTurn(turn({ steps: [[menusFound]], text: '제육볶음이에요.' }), menusExpect, names);

    expect(score.action).toBe('TOOL');
    expect(score.checks.filter(({ passed }) => !passed).map(({ name }) => name)).toEqual([
      'tools.required',
      'mapButtons',
    ]);
  });
});

describe('A turn that is not TOOL', () => {
  it('is one where a lookup found nothing in a case that gives no mentions', () => {
    const none = call('getMenus', { date: '2026-10-25' }, { result: 'none', reason: 'No menu' });
    const silent = expectOf({ actions: ['TOOL'], tools: { required: ['getMenus'] } });

    expect(scoreTurn(turn({ steps: [[none]], text: '그날 메뉴는 없어요.' }), silent, names).action).toBeNull();
  });

  it('is one where a lookup found something and the reply is empty', () => {
    const lookup = expectOf({ actions: ['TOOL'], tools: { required: ['getMenus'] } });

    expect(scoreTurn(turn({ steps: [[menusFound]], text: '' }), lookup, names).action).toBeNull();
  });
});

describe('An ASK turn', () => {
  it('is one where a resolver answered several and the text names the candidates, with no question mark', () => {
    const ask = expectOf({
      actions: ['ASK'],
      tools: { forbidden: ['proposeQuest'] },
      text: { mentions: ['이민수', '김민수'] },
    });

    const score = scoreTurn(
      turn({ steps: [[minsuSeveral]], text: '이민수, 김민수 중 한 분을 알려 주세요.' }),
      ask,
      names,
    );

    expect(score).toMatchObject({ action: 'ASK', passed: true });
  });

  it('is read from the mentions alone when no tool was called', () => {
    const ask = expectOf({
      actions: ['ASK'],
      text: {
        mentions: [
          ['누구', '친구'],
          ['어디', '장소'],
        ],
      },
    });

    expect(scoreTurn(turn({ text: '같이 갈 친구와 장소를 알려 주세요.' }), ask, names).action).toBe('ASK');
  });

  it('is never read from a trailing question mark alone', () => {
    const ask = expectOf({ actions: ['ASK'], text: { mentions: ['이민수', '김민수'] } });

    const score = scoreTurn(turn({ text: '누구랑 가실 건가요?' }), ask, names);

    expect(score.action).not.toBe('ASK');
    expect(score.passed).toBe(false);
  });
});

describe('An ASK the case did not expect', () => {
  it('is the wrong action of a TOOL case answered with a question the trace called for', () => {
    expect(scoreTurn(turn({ steps: [[minsuSeveral]], text: '어느 민수요?' }), menusExpect, names).action).toBe('ASK');
  });
});

describe('An ASK read from the trace', () => {
  it('is still ASK without the mentions, but fails and is not recalled', () => {
    const ask = expectOf({ actions: ['ASK'], text: { mentions: ['이민수', '김민수'] } });

    const score = scoreTurn(turn({ steps: [[minsuSeveral]], text: '어느 민수요?' }), ask, names);

    expect(score).toMatchObject({ action: 'ASK', passed: false, recalled: false });
  });

  it('is recalled when the mentions hold', () => {
    const ask = expectOf({ actions: ['ASK'], text: { mentions: ['이민수', '김민수'] } });

    expect(scoreTurn(turn({ steps: [[minsuSeveral]], text: '이민수, 김민수 중 누구요' }), ask, names).recalled).toBe(
      true,
    );
  });
});

describe('An ASK a tool called for', () => {
  const needs = call(
    'findFreeTimeEvents',
    { date: '2026-11-05' },
    { result: 'needs', needs: { side: 'before', item: '논리설계' } },
  );
  const asked = expectOf({ actions: ['ASK'], text: { mentions: ['어디'] } });

  it('is read from a tool answering needs, and recalled with the mentions', () => {
    const score = scoreTurn(turn({ steps: [[needs]], text: '어디서 출발하세요?' }), asked, names);

    expect(score.action).toBe('ASK');
    expect(score.recalled).toBe(true);
  });

  it('is what the observed action says too', () => {
    expect(observedActionOf(turn({ steps: [[needs]], text: '출발지를 알려 주세요' }))).toBe('ASK');
  });
});

describe('A PROPOSE turn', () => {
  it('is one whose reply carries a Proposal', () => {
    const propose = expectOf({ actions: ['PROPOSE'], tools: { required: ['proposeQuest'] } });

    const score = scoreTurn(turn({ steps: [[proposed]], text: '이렇게 만들까요?', proposal }), propose, names);

    expect(score.action).toBe('PROPOSE');
  });

  it('is not PROPOSE+ASK when proposeQuest refused first and then proposed', () => {
    const propose = expectOf({ actions: ['PROPOSE'] });
    const refused = call('proposeQuest', {}, { result: 'refused', fields: {} });

    expect(
      scoreTurn(turn({ steps: [[refused], [proposed]], text: '만들까요?', proposal }), propose, names).action,
    ).toBe('PROPOSE');
  });
});

describe('A REFUSE or CHAT turn', () => {
  it('calls no tool, and is told apart by what the case accepts', () => {
    const refuse = expectOf({ actions: ['REFUSE'], tools: { forbidden: '*' } });
    const chat = expectOf({ actions: ['CHAT'], tools: { forbidden: '*' } });
    const reply = turn({ text: '그건 도와드릴 수 없어요.' });

    expect(scoreTurn(reply, refuse, names)).toMatchObject({ action: 'REFUSE', passed: true });
    expect(scoreTurn(reply, chat, names)).toMatchObject({ action: 'CHAT', passed: true });
    expect(scoreTurn(turn({ steps: [[menusFound]], text: '안녕하세요' }), chat, names).passed).toBe(false);
  });
});

describe('A TOOL+ASK turn', () => {
  const ambiguous = expectOf({
    actions: ['TOOL+ASK'],
    tools: { required: ['getMenus'], allowed: ['showOnMap'] },
    text: { mentions: [['약속', '같이']] },
  });

  it('shows a lookup and asks about the other reading', () => {
    const shown = turn({
      steps: [[menusFound], [diningShown]],
      text: '내일 점심은 닭갈비덮밥이에요. 혹시 점심 약속을 잡아 드릴까요',
      mapButtons: ['dining'],
    });

    expect(scoreTurn(shown, ambiguous, names)).toMatchObject({ action: 'TOOL+ASK', passed: true });
  });

  it('is only TOOL when the text does not ask', () => {
    const shown = turn({ steps: [[menusFound], [diningShown]], text: '닭갈비덮밥이에요.', mapButtons: ['dining'] });

    expect(scoreTurn(shown, ambiguous, names).action).toBe('TOOL');
  });
});

describe('A PROPOSE+ASK turn', () => {
  const changed = expectOf({ actions: ['PROPOSE+ASK'], text: { mentions: [['오전', '아침']] } });

  it('carries a Proposal and asks', () => {
    const reply = turn({ steps: [[proposed]], text: '19시로 바꿨어요. 혹시 오전 7시를 말씀하신 건가요', proposal });

    expect(scoreTurn(reply, changed, names).action).toBe('PROPOSE+ASK');
  });

  it('is only PROPOSE when the text does not ask', () => {
    const reply = turn({ steps: [[proposed]], text: '19시로 바꿨어요.', proposal });

    expect(scoreTurn(reply, changed, names).action).toBe('PROPOSE');
  });
});

describe('A failed turn', () => {
  it('takes no action and fails with its kind', () => {
    const score = scoreTurn(turn({ steps: [[menusFound]], failure: 'STEP_LIMIT' }), menusExpect, names);

    expect(score).toMatchObject({ action: null, failure: 'STEP_LIMIT', passed: false });
  });
});
