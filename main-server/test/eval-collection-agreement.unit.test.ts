/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type z } from 'zod';
import { agreementOf, agreementOnPairs, agreementOnPosts, yesNoAgreementOf } from '../eval/collection/agreement.ts';
import { type labelsASchema, type labelsBSchema } from '../eval/collection/sets.ts';

// The agreement between two labellers (P05 ticket 01), worked out by hand on small tables.

function pairs(bothYes: number, firstOnly: number, secondOnly: number, bothNo: number): [boolean, boolean][] {
  return [
    ...Array.from({ length: bothYes }, (): [boolean, boolean] => [true, true]),
    ...Array.from({ length: firstOnly }, (): [boolean, boolean] => [true, false]),
    ...Array.from({ length: secondOnly }, (): [boolean, boolean] => [false, true]),
    ...Array.from({ length: bothNo }, (): [boolean, boolean] => [false, false]),
  ];
}

type LabelsA = z.infer<typeof labelsASchema>;
type LabelsB = z.infer<typeof labelsBSchema>;
type Session = LabelsA['items'][number]['sessions'][number];

const side = { title: '', url: 'https://example.com/', file: '', session: null };

function pair(id: string, sameEvent: boolean | null): LabelsB['items'][number] {
  return { id, a: side, b: side, sameEvent, note: null };
}

function session(n: number, place: string | null): Session {
  return { n, start: '2026-11-02T10:00', end: 'none', place, overPeriod: false, mayPublish: true };
}

function post(id: string, announcesEvent: boolean | null, sessions: Session[]): LabelsA['items'][number] {
  return { id, title: '', url: 'https://example.com/', file: '', announcesEvent, sessions, note: null };
}

function labelled<Item>(items: Item[]): { labeller: string; labelledOn: string; items: Item[] } {
  return { labeller: 'someone', labelledOn: '2026-10-31', items };
}

describe('yesNoAgreementOf', () => {
  it('20 yes, 5 and 10 apart, 15 no of 50 → p_o 0.7, κ 0.4, positive 0.727, negative 0.667', () => {
    const agreement = yesNoAgreementOf(pairs(20, 5, 10, 15));
    expect(agreement.n).toBe(50);
    expect(agreement.observed).toBeCloseTo(0.7);
    expect(agreement.kappa).toBeCloseTo(0.4);
    expect(agreement.positive).toBeCloseTo(40 / 55);
    expect(agreement.negative).toBeCloseTo(30 / 45);
  });

  it('every label the same no → p_o 1, and neither κ nor positive agreement can be worked out', () => {
    expect(yesNoAgreementOf(pairs(0, 0, 0, 30))).toMatchObject({
      observed: 1,
      kappa: null,
      positive: null,
      negative: 1,
    });
  });

  it('nothing to compare → no numbers', () => {
    expect(yesNoAgreementOf([])).toMatchObject({ n: 0, observed: null, kappa: null });
  });
});

describe('agreementOf', () => {
  it('three answers, 2 of 4 alike → p_o 0.5', () => {
    const agreement = agreementOf([
      ['a', 'a'],
      ['b', 'b'],
      ['c', 'a'],
      ['a', 'c'],
    ]);
    expect(agreement.observed).toBeCloseTo(0.5);
    // The chance agreement is 0.5×0.5 + 0.25×0.25 + 0.25×0.25 = 0.375.
    expect(agreement.kappa).toBeCloseTo(0.2);
  });
});

describe('agreementOnPairs', () => {
  it('counts only the pairs both labellers have filled in', () => {
    const owner = labelled([pair('b-001', false), pair('b-002', null), pair('b-003', true)]);
    const second = labelled([pair('b-001', false), pair('b-002', false), pair('b-003', false)]);
    expect(agreementOnPairs(owner, second)).toMatchObject({ n: 2, bothNo: 1, oneOfEach: 1 });
  });
});

describe('agreementOnPosts', () => {
  it('a session only one labeller read → a disagreement on each of its fields', () => {
    const owner = labelled([post('a-001', true, [session(1, 'x'), session(2, 'x')])]);
    const second = labelled([post('a-001', true, [session(1, 'x')])]);
    const agreement = agreementOnPosts(owner, second);
    expect(agreement.announcesEvent).toMatchObject({ n: 1, observed: 1 });
    expect(agreement.place).toMatchObject({ n: 2, observed: 0.5 });
  });

  it("leaves out a blank and an item the second labeller wasn't given", () => {
    const owner = labelled([post('a-001', null, [session(1, null)]), post('a-002', true, [])]);
    const second = labelled([post('a-001', true, [session(1, 'x')])]);
    const agreement = agreementOnPosts(owner, second);
    expect(agreement.announcesEvent.n).toBe(0);
    expect(agreement.place.n).toBe(0);
  });
});
