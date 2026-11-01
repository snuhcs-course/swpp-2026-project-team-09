/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type GoldPost, type GoldSession } from '../eval/collection/gold.ts';
import { type StoredJudgement } from '../eval/collection/model-calls.ts';
import { type ReadPost } from '../eval/collection/read-post.ts';
import { type OutputSession, type PostReading } from '../eval/collection/reading.ts';
import { aligned, endIsWrong, scoreA, startIsRight } from '../eval/collection/score-a.ts';
import { verdictsOf } from '../eval/collection/verdicts.ts';

const POST: ReadPost = {
  post: 'snu-1',
  source: 'snu_events',
  key: '1',
  now: new Date('2026-10-31T00:00:00Z'),
  title: '제목',
  description: '일시: 2026. 11. 2. 14:00\n신청 기간: 2026. 11. 5.',
  links: [],
  sessions: [],
};

function gold(changes: Partial<GoldSession> = {}): GoldSession {
  return {
    n: 1,
    start: '2026-11-02T14:00',
    end: '2026-11-02T15:00',
    placeId: 'p1',
    overPeriod: false,
    mayPublish: true,
    ...changes,
  };
}

function output(changes: Partial<OutputSession> = {}): OutputSession {
  return {
    number: 1,
    title: '제목',
    start: new Date('2026-11-02T14:00:00+09:00'),
    end: new Date('2026-11-02T15:00:00+09:00'),
    place: '장소',
    placeId: 'p1',
    overPeriod: false,
    passed: true,
    via: 'judgement',
    failedChecks: [],
    ...changes,
  };
}

function post(id: string, sessions: GoldSession[], announcesEvent = true): GoldPost {
  return { id, post: id, announcesEvent, sessions };
}

function readingsOf(
  entries: Record<string, OutputSession[]>,
  judgement: StoredJudgement | null = null,
): Map<string, PostReading> {
  return new Map(
    Object.entries(entries).map(([id, outputs]) => [id, { post: { ...POST, post: id }, judgement, outputs }]),
  );
}

describe('aligning outputs with the answer', () => {
  it('takes the same minute before the same day, and what is left in order', () => {
    const [first, second] = [gold({ n: 1, start: '2026-11-02T14:00' }), gold({ n: 2, start: '2026-11-03T14:00' })];
    const sameDay = output({ start: new Date('2026-11-02T16:00:00+09:00') });
    const sameMinute = output({ start: new Date('2026-11-02T14:00:00+09:00') });
    const pairs = aligned([sameDay, sameMinute], [first, second]);
    expect(pairs.get(sameMinute)).toBe(first);
    expect(pairs.get(sameDay)).toBe(second);
  });

  it('lets a session that passed choose before a failed repeat', () => {
    const answer = gold();
    const [failed, passed] = [output({ passed: false }), output()];
    const pairs = aligned([failed, passed], [answer]);
    expect(pairs.get(passed)).toBe(answer);
    expect(pairs.has(failed)).toBe(false);
  });
});

describe('what is wrong in a published session', () => {
  it('reads a label of a day alone as that day, but not a time on it away from a period', () => {
    const answer = gold({ start: '2026-11-02', end: 'none' });
    expect(startIsRight(output(), answer)).toBe(false);
    expect(startIsRight(output({ overPeriod: true }), answer)).toBe(true);
    expect(startIsRight(output({ start: new Date('2026-11-02T00:00:00+09:00') }), answer)).toBe(true);
  });

  it('calls an end the post does not give wrong, and one left out not', () => {
    expect(endIsWrong(output(), gold({ end: 'none' }))).toBe(true);
    expect(endIsWrong(output({ end: null }), gold())).toBe(false);
    expect(endIsWrong(output({ end: new Date('2026-11-02T16:00:00+09:00') }), gold())).toBe(true);
  });

  it('reads the last minute of a period as its day', () => {
    const answer = gold({ end: '2026-11-30' });
    expect(endIsWrong(output({ end: new Date('2026-11-30T23:59:00+09:00') }), answer)).toBe(false);
  });
});

describe('scoreA: what was published', () => {
  it('pairs what was published right with what may be published', () => {
    const golds = [post('right', [gold()]), post('missed', [gold()]), post('wrong', [gold()])];
    const { c1, c2, rows } = scoreA(
      golds,
      readingsOf({
        right: [output()],
        missed: [output({ passed: false, failedChecks: ['placeMatches'] })],
        wrong: [output({ start: new Date('2026-11-02T16:00:00+09:00') })],
      }),
    );
    expect(c1).toEqual({ k: 1, n: 3 });
    expect(c2).toEqual({ k: 1, n: 2 });
    expect(rows.map(({ id, cause }) => [id, cause])).toEqual([
      ['missed', '캠퍼스 기본 가정'],
      ['wrong', '추출'],
    ]);
  });

  it('counts a wrong Place published apart from one a check stopped', () => {
    const { c3 } = scoreA(
      [post('one', [gold()]), post('two', [gold()])],
      readingsOf({
        one: [output({ placeId: 'p2' })],
        two: [output({ placeId: 'p2', passed: false })],
      }),
    );
    expect(c3).toEqual({ published: 1, allGiven: 2 });
  });

  it('counts a place named where the answer says none as wrong', () => {
    const { c3 } = scoreA([post('one', [gold({ placeId: null })])], readingsOf({ one: [output()] }));
    expect(c3.published).toBe(1);
  });

  it('counts a post with no event that was published', () => {
    const { c2, c5 } = scoreA([post('one', [], false)], readingsOf({ one: [output()] }));
    expect(c5).toBe(1);
    expect(c2).toEqual({ k: 1, n: 1 });
  });
});

describe('scoreA: what was read', () => {
  it('scores whether a session is over a period across all the answer, a session with no output being wrong', () => {
    const golds = [post('one', [gold(), gold({ n: 2, start: '2026-11-03', overPeriod: true })])];
    const { c6 } = scoreA(golds, readingsOf({ one: [output()] }));
    expect(c6).toEqual({ k: 1, n: 2 });
  });

  it('counts a start that is a day on an application line as C7', () => {
    const published = output({ start: new Date('2026-11-05T14:00:00+09:00'), end: null });
    const { c7 } = scoreA([post('one', [gold()])], readingsOf({ one: [published] }));
    expect(c7).toBe(1);
  });

  it('keeps precision, recall and made-up values of each field', () => {
    const { c4 } = scoreA([post('one', [gold({ end: 'none', placeId: null })])], readingsOf({ one: [output()] }));
    expect(c4.start.precision).toEqual({ k: 1, n: 1 });
    expect(c4.end.madeUp).toEqual({ k: 1, n: 1 });
    expect(c4.place.madeUp).toEqual({ k: 1, n: 1 });
    expect(c4.place.recall).toEqual({ k: 0, n: 0 });
  });

  it('tells a malformed answer from a call that failed', () => {
    const failed = readingsOf({ one: [] }, { answer: null, failure: 'NoObjectGeneratedError', modelId: null });
    expect(scoreA([post('one', [])], failed).c4).toMatchObject({ schema: { k: 0, n: 1 }, failedCalls: 0 });
    const gone = readingsOf({ one: [] }, { answer: null, failure: 'APICallError: HTTP 500', modelId: null });
    expect(scoreA([post('one', [])], gone).c4).toMatchObject({ schema: { k: 0, n: 0 }, failedCalls: 1 });
  });

  it('has no schema to score with no model', () => {
    expect(scoreA([post('one', [])], readingsOf({ one: [] })).c4.schema).toBeNull();
  });
});

describe('verdictsOf for evaluation A', () => {
  it('reads each threshold, with nothing counted passing nothing', () => {
    const verdicts = verdictsOf({ a: scoreA([post('one', [gold()])], readingsOf({ one: [] })) });
    const of = (id: string): string | undefined => verdicts.find((verdict) => verdict.id === id)?.result;
    expect(of('c1.floor')).toBe('FAIL');
    expect(of('c2.floor')).toBe('n/a');
    expect(of('c3.floor')).toBe('PASS');
    expect(of('c4.schema.floor')).toBe('n/a');
    expect(verdicts.find(({ id }) => id === 'c1.floor')?.measured).toBe('0/1');
  });
});
