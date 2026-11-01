/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type GoldPair } from '../eval/collection/gold.ts';
import { titleSimilarity } from '../eval/collection/same-event-step.ts';
import { isEarlier, scoreB } from '../eval/collection/score-b.ts';
import { verdictsOf } from '../eval/collection/verdicts.ts';
import { NEVER_ASKED, NEW, pair, reading, START, STORED, worldOf } from './eval-collection-pairs.js';

describe('which post of a pair came first', () => {
  it('takes extra.snu before SNU Now, and the smaller key within a Source', () => {
    expect(isEarlier('extra-PGM012002390', 'snu-1')).toBe(true);
    expect(isEarlier('snu-1', 'extra-PGM012002390')).toBe(false);
    expect(isEarlier('snu-9', 'snu-10')).toBe(true);
  });
});

describe('titleSimilarity', () => {
  it('is one for equal normalised titles and low for others', () => {
    expect(titleSimilarity('[센터] 면접 특강', '면접특강')).toBe(1);
    expect(titleSimilarity('면접 특강', '재즈 공연')).toBe(0);
  });
});

describe('the naive run', () => {
  it('attaches equal starts with similar titles, with no refusing rule, and never asks', async () => {
    const { pairs, d1, d4 } = await scoreB(
      [pair('b-1', STORED, NEW, false)],
      worldOf(reading(STORED, { title: '알렉산더 테크닉 대면' }), reading(NEW, { title: '알렉산더 테크닉 비대면' })),
      'naive',
      NEVER_ASKED,
    );
    expect(pairs[0]?.result).toBe('attached');
    expect(d1).toBe(1);
    expect(d4).toMatchObject({ k: 0, n: 1 });
  });

  it('leaves another start alone', async () => {
    const later = new Date('2026-11-02T15:00:00+09:00');
    const { pairs } = await scoreB(
      [pair('b-1', STORED, NEW, true)],
      worldOf(reading(STORED), reading(NEW, { starts: [later] })),
      'naive',
      NEVER_ASKED,
    );
    expect(pairs[0]?.result).toBe('none');
  });
});

describe("08a's rules", () => {
  it('refuses what the naive run attached, and attaches equal titles and starts', async () => {
    const pairs = [pair('b-1', STORED, NEW, false), pair('b-2', 'extra-PGM2', 'snu-200', true)];
    const world = worldOf(
      reading(STORED, { title: '테크닉 대면' }),
      reading(NEW, { title: '테크닉 비대면' }),
      reading('extra-PGM2', { title: '[센터] 면접 특강' }),
      reading('snu-200', { title: '면접 특강' }),
    );
    const { pairs: results, d1, d2, d6 } = await scoreB(pairs, world, 'rules', NEVER_ASKED);
    expect(results.map(({ result }) => result)).toEqual(['none', 'attached']);
    expect(d1).toBe(0);
    expect(d2).toMatchObject({ tp: 1, fp: 0, fn: 0 });
    expect(d6).toEqual({ k: 1, n: 1 });
  });

  it('attaches by a link whatever the times, before anything else', async () => {
    const description = 'https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM1';
    const { pairs, d3 } = await scoreB(
      [pair('b-1', STORED, NEW, true, 'body-link')],
      worldOf(reading(STORED, { title: '하나' }), reading(NEW, { title: '둘', description, starts: [null] })),
      'rules',
      NEVER_ASKED,
    );
    expect(pairs[0]).toMatchObject({ result: 'attached', by: 'link', reached: true });
    expect(d3).toEqual({ k: 1, n: 1 });
  });
});

describe("08a's rules: a link", () => {
  it('holds a link that is not one to one', async () => {
    const description = 'https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM1';
    const { pairs, d4, recallWithQueue, d6 } = await scoreB(
      [pair('b-1', STORED, NEW, true, 'body-link')],
      worldOf(
        reading(STORED, { starts: [START, new Date('2026-11-09T14:00:00+09:00')] }),
        reading(NEW, { title: '둘', description }),
      ),
      'rules',
      NEVER_ASKED,
    );
    expect(pairs[0]?.result).toBe('held');
    expect(d4).toEqual({ k: 1, n: 1, byHold: { link_not_one_to_one: 1 } });
    expect(recallWithQueue).toEqual({ k: 1, n: 1 });
    expect(d6).toEqual({ k: 0, n: 1 });
  });

  it('holds a post that also names a post outside the set, as the whole store would', async () => {
    const description =
      'https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM1 https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM2';
    const { pairs, d1, d4 } = await scoreB(
      [pair('b-1', STORED, NEW, false, 'in-person-or-online')],
      worldOf(reading(STORED), reading(NEW, { title: '둘', description })),
      'rules',
      NEVER_ASKED,
    );
    expect(pairs[0]?.result).toBe('held');
    expect(d1).toBe(0);
    expect(d4).toEqual({ k: 1, n: 1, byHold: { link_not_one_to_one: 1 } });
  });

  it('counts a session a Judgement added to the linked post, as its rows are', async () => {
    const description = 'https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM1';
    const stored = reading(STORED);
    const [first] = stored.outputs;
    const added = first === undefined ? [] : [{ ...first, number: 2, via: 'judgement' as const }];
    const { pairs } = await scoreB(
      [pair('b-1', STORED, NEW, true, 'body-link')],
      worldOf({ ...stored, outputs: [...stored.outputs, ...added] }, reading(NEW, { title: '둘', description })),
      'rules',
      NEVER_ASKED,
    );
    expect(pairs[0]?.result).toBe('held');
  });
});

describe("08a's rules: a link and the rest of the step", () => {
  it('leaves a post alone when the linked post has a session no one read', async () => {
    const description = 'https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM1';
    const { pairs } = await scoreB(
      [pair('b-1', STORED, NEW, true, 'body-link')],
      worldOf(reading(STORED, { starts: [null] }), reading(NEW, { title: '둘', description })),
      'rules',
      NEVER_ASKED,
    );
    expect(pairs[0]).toMatchObject({ result: 'none', by: null });
  });
});

function ofSession(session: number): GoldPair {
  return Object.assign(pair(`b-${session}`, STORED, NEW, true), {
    a: { post: STORED, session },
    b: { post: NEW, session },
  });
}

describe('D1', () => {
  it('counts a session attached to another session of a true pair of posts', async () => {
    const other = new Date('2026-11-09T14:00:00+09:00');
    const { d1, d2, rows } = await scoreB(
      [ofSession(1), ofSession(2)],
      worldOf(reading(STORED, { starts: [START, other] }), reading(NEW, { starts: [other, null] })),
      'rules',
      NEVER_ASKED,
    );
    expect(d2.fp).toBe(0);
    expect(d1).toBe(1);
    expect(rows.map(({ failed }) => failed)).toContain('다른 회차에 붙음 (title)');
  });
});

describe("08a's rules: the candidates", () => {
  it('counts a true pair of sessions more than a day apart as missed by the candidates', async () => {
    const { d3, rows } = await scoreB(
      [pair('b-1', STORED, NEW, true)],
      worldOf(reading(STORED), reading(NEW, { starts: [new Date('2026-11-05T14:00:00+09:00')] })),
      'rules',
      NEVER_ASKED,
    );
    expect(d3).toEqual({ k: 0, n: 1 });
    expect(rows[0]?.cause).toBe('후보 단계 누락');
  });

  it('keeps candidates on the day before or after, for the AI', async () => {
    const { d3 } = await scoreB(
      [pair('b-1', STORED, NEW, true)],
      worldOf(reading(STORED), reading(NEW, { starts: [new Date('2026-11-03T14:00:00+09:00')] })),
      'rules',
      NEVER_ASKED,
    );
    expect(d3).toEqual({ k: 1, n: 1 });
  });

  it('holds a session whose title and start match several partners', async () => {
    const { d4 } = await scoreB(
      [pair('b-1', STORED, NEW, true), pair('b-2', 'extra-PGM2', NEW, true)],
      worldOf(reading(STORED), reading('extra-PGM2'), reading(NEW)),
      'rules',
      NEVER_ASKED,
    );
    expect(d4).toEqual({ k: 1, n: 1, byHold: { several_matches: 1 } });
  });
});

describe('verdictsOf for evaluation B', () => {
  it('reads each threshold', async () => {
    const score = await scoreB(
      [pair('b-1', STORED, NEW, true)],
      worldOf(reading(STORED), reading(NEW)),
      'rules',
      NEVER_ASKED,
    );
    const verdicts = verdictsOf({ b: score });
    expect(verdicts.find(({ id }) => id === 'd1.floor')).toMatchObject({ result: 'PASS', measured: '0' });
    expect(verdicts.find(({ id }) => id === 'd3.target')).toMatchObject({ result: 'PASS', measured: '1/1' });
    expect(verdicts.some(({ id }) => id === 'd5.diagnostic')).toBe(false);
  });
});
