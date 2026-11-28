/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { numberOnly } from '@/features/assistant/answer-label-fits';

// A tag that gives way to its number alone keeps the colour its words had (P01 ticket 42): a candidate held at a point
// another mark holds was drawn in the meal's coral once its minutes gave way, whatever its kind. Partitions: a kind; a
// study place's; a faded one; a tag with none of them.
describe('a tag shrunk to its number', () => {
  it('keeps its kind, its study colour, and its fading, and drops its words', () => {
    expect(
      numberOnly({ tone: 'minutes', title: '4분', line: null, number: 3, meal: true, kind: 'event', clock: true }),
    ).toEqual({ tone: 'minutes', title: '', line: null, number: 3, meal: true, kind: 'event' });
    expect(numberOnly({ tone: 'minutes', title: '7분', line: null, number: 2, study: true, faded: true })).toEqual({
      tone: 'minutes',
      title: '',
      line: null,
      number: 2,
      study: true,
      faded: true,
    });
  });

  it('is its tone and number alone when its words had no colour of their own', () => {
    expect(numberOnly({ tone: 'candidate', title: '3식당', line: '12:18', number: 4 })).toEqual({
      tone: 'candidate',
      title: '',
      line: null,
      number: 4,
    });
  });
});
