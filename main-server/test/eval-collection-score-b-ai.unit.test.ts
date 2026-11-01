/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type GoldPair } from '../eval/collection/gold.ts';
import { type AskAboutPost } from '../eval/collection/same-event-step.ts';
import { scoreB } from '../eval/collection/score-b.ts';
import { answering, NEVER_ASKED, NEW, pair, reading, START, STORED, worldOf } from './eval-collection-pairs.js';

describe("08b's AI choice", () => {
  const apart = worldOf(reading(STORED, { title: '건강주간 요가' }), reading(NEW, { title: '건강주간 안내' }));

  it('attaches what it chooses, and D1 counts a wrong choice', async () => {
    const { pairs, d1, rows } = await scoreB(
      [pair('b-1', STORED, NEW, false)],
      apart,
      'ai',
      answering('chosen', `${STORED}#1`),
    );
    expect(pairs[0]).toMatchObject({ result: 'attached', by: 'ai' });
    expect(d1).toBe(1);
    expect(rows[0]?.cause).toBe('모델 판단');
  });

  it.each([
    ['unsure', 'ai_unsure'],
    ['failed', 'ai_failed'],
  ] as const)('holds %s as %s', async (outcome, hold) => {
    const { pairs, d4 } = await scoreB([pair('b-1', STORED, NEW, true)], apart, 'ai', answering(outcome));
    expect(pairs[0]?.result).toBe('held');
    expect(d4.byHold).toEqual({ [hold]: 1 });
  });

  it('makes a post its own on none', async () => {
    const { pairs, d4 } = await scoreB([pair('b-1', STORED, NEW, true)], apart, 'ai', answering('none'));
    expect(pairs[0]?.result).toBe('none');
    expect(d4.k).toBe(0);
  });
});

describe("08b's AI choice: what it is asked", () => {
  it('asks nothing of what the title rule decides or of a refused candidate', async () => {
    const world = worldOf(
      reading(STORED, { title: '같은 제목' }),
      reading(NEW, { title: '같은 제목' }),
      reading('extra-PGM2', { title: '테크닉 대면' }),
      reading('snu-200', { title: '테크닉 비대면' }),
    );
    const { pairs } = await scoreB(
      [pair('b-1', STORED, NEW, true), pair('b-2', 'extra-PGM2', 'snu-200', false)],
      world,
      'ai',
      NEVER_ASKED,
    );
    expect(pairs.map(({ result }) => result)).toEqual(['attached', 'none']);
  });
});

describe("08b's AI choice: one question", () => {
  it('asks about a post once, with all its partners as candidates', async () => {
    const asked: string[][] = [];
    const ask: AskAboutPost = (_post, { sessions }) => {
      asked.push(sessions.flatMap(({ candidates }) => candidates.map(({ id }) => id)));
      return answering('unsure')(_post, { post: { title: '', text: '' }, source: '', sessions });
    };
    await scoreB(
      [pair('b-1', STORED, NEW, true), pair('b-2', 'extra-PGM2', NEW, false)],
      worldOf(
        reading(STORED, { title: '하나' }),
        reading('extra-PGM2', { title: '둘둘' }),
        reading(NEW, { title: '셋셋' }),
      ),
      'ai',
      ask,
    );
    expect(asked).toEqual([[`${STORED}#1`, 'extra-PGM2#1']]);
  });

  it('reads a pair of one session only from that session', async () => {
    const twoSessions = [START, new Date('2026-11-09T14:00:00+09:00')];
    const scoped: GoldPair = {
      id: 'b-1',
      a: { post: STORED, session: 2 },
      b: { post: NEW, session: null },
      chosenAs: 'another-round',
      sameEvent: false,
    };
    const { pairs } = await scoreB(
      [scoped],
      worldOf(reading(STORED, { starts: twoSessions, title: '같은 제목' }), reading(NEW, { title: '같은 제목' })),
      'rules',
      NEVER_ASKED,
    );
    expect(pairs[0]).toMatchObject({ result: 'none', reached: false });
  });
});

describe('D5', () => {
  it('counts a post of many pairs as right only when all its true pairs attach and no false one does', async () => {
    const hub = 'snu-500';
    const pairs = [
      pair('b-1', 'extra-PGM1', hub, true, 'many-to-one'),
      pair('b-2', 'extra-PGM2', hub, true, 'many-to-one'),
      pair('b-3', 'extra-PGM3', 'snu-600', true, 'many-to-one'),
      pair('b-4', 'extra-PGM4', 'snu-600', false, 'many-to-one'),
    ];
    const world = worldOf(
      reading('extra-PGM1', { title: '가', starts: [START] }),
      reading('extra-PGM2', { title: '나', starts: [new Date('2026-11-02T15:00:00+09:00')] }),
      reading(hub, {
        titles: ['가', '나'],
        starts: [START, new Date('2026-11-02T15:00:00+09:00')],
      }),
      reading('extra-PGM3', { title: '다' }),
      reading('extra-PGM4', { title: '라' }),
      reading('snu-600', { title: '마' }),
    );
    const { d5 } = await scoreB(pairs, world, 'rules', NEVER_ASKED);
    expect(d5).toEqual({ k: 1, n: 2 });
  });
});
