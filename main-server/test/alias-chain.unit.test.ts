/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { aliasOf, chainOf, sourceOf, standingOf, visitsFrom } from '../src/assistant/aliases/alias-chain.js';
import {
  type ChainRow,
  sessionsOf,
  type Transitions,
  transitionsOf,
  walkOf,
} from '../src/assistant/aliases/alias-sessions.js';

// The absorbing Markov chain everyone's aliases are learned by (P07 ticket 06), on hand-made rows: the sessions, the
// walks, the counts, the series against the closed-form fundamental matrix, and the alias rule.

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date('2026-10-26T01:00:00Z');
const OLD = new Date(START.getTime() - 30 * DAY_MS);

let ids = 0;

type Partial = Pick<ChainRow, 'userId' | 'words' | 'outcome'> & {
  minute?: number;
  result?: ChainRow['result'];
  aliasSource?: ChainRow['aliasSource'];
  candidateIds?: string[];
  chosenId?: string;
  onboardedAt?: Date | null;
};

function row({ minute = 0, candidateIds = [], onboardedAt = OLD, ...rest }: Partial): ChainRow {
  ids += 1;
  return {
    id: String(ids).padStart(3, '0'),
    result: null,
    aliasSource: null,
    chosenId: null,
    ...rest,
    candidateIds,
    onboardedAt,
    createdAt: new Date(START.getTime() + minute * MINUTE_MS),
  };
}

const answered = (userId: string, words: string, result: 'none' | 'several', minute = 0): ChainRow =>
  row({ userId, words, outcome: 'answered', result, minute });
const resolved = (userId: string, words: string, placeId: string, minute = 0, aliasSource?: 'global'): ChainRow =>
  row({ userId, words, outcome: 'answered', result: 'one', candidateIds: [placeId], minute, aliasSource });
const chosen = (userId: string, words: string, placeId: string, minute = 0): ChainRow =>
  row({ userId, words, outcome: 'chosen', chosenId: placeId, minute });
const edited = (userId: string, words: string, from: string, to: string, minute = 0): ChainRow =>
  row({ userId, words, outcome: 'edited', candidateIds: [from], chosenId: to, minute });
const rejected = (userId: string, words: string, placeId: string, minute = 0): ChainRow =>
  row({ userId, words, outcome: 'rejected', chosenId: placeId, minute });

const idsOf = (sessions: ChainRow[][]): string[][] => sessions.map((session) => session.map(({ id }) => id));

function daysBefore(days: number): Date {
  return new Date(START.getTime() - days * DAY_MS);
}

describe('Sessions', () => {
  it("are one account's rows in time order, cut at a gap over 5 minutes and after a rejection", () => {
    const rows = [
      answered('u1', '학관', 'several', 3),
      answered('u1', '학관', 'none', 0),
      answered('u1', '학관', 'none', 9),
      rejected('u1', '학관', 'p', 10),
      answered('u1', '학관', 'none', 11),
      answered('u2', '학관', 'none', 0),
    ];
    const [a, b, c, d, e, f] = rows.map(({ id }) => id);

    expect(idsOf(sessionsOf(rows))).toEqual([[b, a], [c, d], [e], [f]]);
  });

  it('end where the User, having reached a Place, goes on to other words, and not at a rephrase', () => {
    const newRequest = [resolved('u', '학관', 'p'), chosen('u', '중도', 'q')];
    const rephrase = [answered('u', '경영대', 'none'), resolved('u', '경영대학', 'p')];
    const corrected = [
      resolved('u', '학관', 'p0'),
      row({ userId: 'u', words: '', outcome: 'edited', candidateIds: ['p0'], chosenId: 'p1' }),
    ];

    expect(idsOf(sessionsOf(newRequest))).toEqual(newRequest.map((item) => [item.id]));
    expect(idsOf(sessionsOf(rephrase))).toEqual([rephrase.map((item) => item.id)]);
    expect(idsOf(sessionsOf(corrected))).toEqual([corrected.map((item) => item.id)]);
  });

  it('teach only for an account onboarded 7 days or more before their first row', () => {
    const young = row({ userId: 'u', words: '학관', outcome: 'chosen', chosenId: 'p', onboardedAt: daysBefore(6) });
    const unknown = row({ userId: 'v', words: '학관', outcome: 'chosen', chosenId: 'p', onboardedAt: null });
    const old = row({ userId: 'w', words: '학관', outcome: 'chosen', chosenId: 'p', onboardedAt: daysBefore(7) });

    expect(idsOf(sessionsOf([young, unknown, old]))).toEqual([[old.id]]);
  });
});

describe('The walk of a session', () => {
  it('visits each reading, the words left open and then the Place for an alias answer, and succeeds after a Place', () => {
    const walk = walkOf([answered('u', '경영대', 'none'), resolved('u', '경영대학', 'p', 1, 'global')]);

    expect(walk).toEqual({
      userId: 'u',
      visits: [
        { state: 'open:경영대', words: '경영대' },
        { state: 'open:경영대학', words: '경영대학' },
        { state: 'place:p', words: '경영대학' },
      ],
      end: '+',
    });
  });

  it('inserts the words a chip answers, the Place an edit replaced and the Place a rejection leaves', () => {
    expect(walkOf([chosen('u', '학관', 'p')])?.visits.map(({ state }) => state)).toEqual(['open:학관', 'place:p']);
    expect(
      walkOf([resolved('u', '학관', 'p0'), edited('u', '학관', 'p0', 'p1', 1)])?.visits.map(({ state }) => state),
    ).toEqual(['place:p0', 'place:p1']);
    expect(walkOf([edited('u', '학관', 'p0', 'p1')])?.visits.map(({ state }) => state)).toEqual([
      'place:p0',
      'place:p1',
    ]);
    expect(walkOf([rejected('u', '학관', 'p')])).toEqual({
      userId: 'u',
      visits: [{ state: 'place:p', words: '학관' }],
      end: '-',
    });
  });

  it('fails after words left open, and is nothing when no row makes a state', () => {
    expect(walkOf([answered('u', '학관', 'several')])?.end).toBe('-');
    expect(walkOf([row({ userId: 'u', words: '', outcome: 'edited', chosenId: 'p1' })])).toBeNull();
  });
});

describe('The transitions', () => {
  it('count each step of the walks, self-loops included, and the accounts of successful sessions as supporters', () => {
    const { counts, supporters } = transitionsOf(
      sessionsOf([
        chosen('u1', '학관', 'p'),
        answered('u2', '학관', 'several'),
        chosen('u2', '학관', 'p', 1),
        rejected('u2', '학관', 'p', 2),
        resolved('u3', '학관', 'p'),
        resolved('u3', '학관', 'p', 1),
      ])
        .map((session) => walkOf(session))
        .filter((walk) => walk !== null),
    );

    expect(counts.get('open:학관')).toEqual(new Map([['place:p', 2]]));
    expect(counts.get('place:p')).toEqual(
      new Map([
        ['+', 2],
        ['-', 1],
        ['place:p', 1],
      ]),
    );
    expect([...(supporters.get('학관')?.get('p') ?? [])]).toEqual(['u1', 'u3']);
  });
});

function transitions(counts: Record<string, Record<string, number>>): Transitions {
  return {
    counts: new Map(Object.entries(counts).map(([from, out]) => [from, new Map(Object.entries(out))])),
    supporters: new Map(),
  };
}

describe('The series', () => {
  it('gives the fundamental matrix (I − Q)⁻¹ on a chain with a self-loop', () => {
    // Q = [[0.5, 0.25], [0, 0]], so (I − Q)⁻¹ = [[2, 0.5], [0, 1]].
    const visits = visitsFrom(transitions({ a: { a: 2, b: 1, '+': 1 }, b: { '+': 1 } }), 'a');

    expect(visits.get('a')).toBeCloseTo(2, 6);
    expect(visits.get('b')).toBeCloseTo(0.5, 6);
    expect(visitsFrom(transitions({ a: { a: 2, b: 1, '+': 1 }, b: { '+': 1 } }), 'b')).toEqual(new Map([['b', 1]]));
  });

  it("gives a quarter to each of four equal transitions, as the paper's worked example", () => {
    const visits = visitsFrom(
      transitions({ h0: { h0: 1, h1: 1, h3: 1, '-': 1 }, h1: { '+': 1 }, h3: { '-': 1 } }),
      'h0',
    );

    expect(visits.get('h0')).toBeCloseTo(4 / 3, 6);
    expect(visits.get('h1')).toBeCloseTo(1 / 3, 6);
    expect(visits.get('h3')).toBeCloseTo(1 / 3, 6);
  });

  it('visits a state never left once', () => {
    expect(visitsFrom(transitions({}), 'open:학관')).toEqual(new Map([['open:학관', 1]]));
  });
});

describe('The source of words', () => {
  it('is the one Place the rules read, else the words left open', () => {
    expect(sourceOf('학관', ['p'])).toBe('place:p');
    expect(sourceOf('학관', [])).toBe('open:학관');
    expect(sourceOf('학관', ['p', 'q'])).toBe('open:학관');
  });
});

function chips(count: number, words: string, placeId: string, minute = 0): ChainRow[] {
  return Array.from({ length: count }, (_, at) => chosen(`${words}${placeId}${at}`, words, placeId, minute));
}

describe('The alias', () => {
  it('is the Place of greatest Φ∞ beating the reading, with 3 accounts and 0.8 of the reach', () => {
    const { alias, ownSuccess } = aliasOf(chainOf(chips(3, '학관', 'p')), '학관', 'open:학관');

    expect(ownSuccess).toBe(0);
    expect(alias).toEqual({ placeId: 'p', reach: 1, share: 1, success: 1, supporters: 3, rejecters: 0 });
  });

  it('is none under 3 accounts, or when another Place takes more than a fifth of the reach', () => {
    expect(aliasOf(chainOf(chips(2, '학관', 'p')), '학관', 'open:학관').alias).toBeNull();
    expect(
      aliasOf(chainOf([...chips(3, '학관', 'p'), ...chips(1, '학관', 'q')]), '학관', 'open:학관').alias,
    ).toBeNull();
  });

  it('takes the share on the sessions that reach a Place, not raised by a Place others visit again and again', () => {
    const revisited = Array.from({ length: 10 }, (_, at) => [
      resolved(`v${at}`, '학생회관', 'p'),
      resolved(`v${at}`, '학생회관', 'p', 1),
    ]).flat();
    const decision = aliasOf(
      chainOf([...chips(3, '학관', 'p'), ...chips(1, '학관', 'q'), ...revisited]),
      '학관',
      'open:학관',
    );

    expect(decision.candidates.map(({ placeId, reach, share }) => [placeId, reach, share])).toEqual([
      ['p', 0.75, 0.75],
      ['q', 0.25, 0.25],
    ]);
    // The revisits raise the expected visits to 0.75 × 23/13 and lower the one-step success to 13/23: Φ∞ is still the
    // chance of succeeding through the Place, 0.75, while a share on the expected visits would have passed 0.8.
    expect(decision.candidates[0]?.success).toBeCloseTo(0.75, 6);
    expect(decision.alias).toBeNull();
  });

  it('learns words answered none from the Place the accounts then named in the session', () => {
    const rows = ['u1', 'u2', 'u3'].flatMap((user) => [
      answered(user, '경영대', 'none'),
      resolved(user, '경영대학', 'p', 1),
    ]);

    expect(aliasOf(chainOf(rows), '경영대', 'open:경영대').alias).toMatchObject({ placeId: 'p', supporters: 3 });
  });
});

describe('The alias of words the rules read as a Place', () => {
  it('is none when the reading is a Place that succeeds on its own, and the Place it is always corrected to', () => {
    const corrected = ['u1', 'u2', 'u3'].flatMap((user) => [
      resolved(user, '학관', 'p0'),
      edited(user, '학관', 'p0', 'p1', 1),
    ]);
    const succeeding = Array.from({ length: 7 }, (_, at) => resolved(`v${at}`, '학생회관', 'p0'));

    expect(aliasOf(chainOf([...corrected, ...succeeding]), '학관', 'place:p0')).toMatchObject({
      ownSuccess: 0.7,
      alias: null,
    });
    expect(aliasOf(chainOf(corrected), '학관', 'place:p0').alias).toMatchObject({ placeId: 'p1', success: 1 });
  });

  it('counts the distinct accounts that rejected a Place, whatever their age, and gives a standing for any Place', () => {
    const young = row({ userId: 'y', words: '학관', outcome: 'rejected', chosenId: 'p', onboardedAt: daysBefore(1) });
    const chain = chainOf([...chips(3, '학관', 'p'), young, rejected('z', '학관', 'p'), rejected('z', '학관', 'p', 1)]);
    const decision = aliasOf(chain, '학관', 'open:학관');

    expect(decision.alias).toMatchObject({ placeId: 'p', supporters: 3, rejecters: 2 });
    expect(standingOf(chain, decision, '학관', 'q')).toEqual({
      placeId: 'q',
      reach: 0,
      share: 0,
      success: 0,
      supporters: 0,
      rejecters: 0,
    });
  });
});
