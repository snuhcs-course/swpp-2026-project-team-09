/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { mayCallModel, parseCollectionFlags } from '../eval/collection/run-options.ts';

describe('the flags of a run', () => {
  it('reads the development part unless told otherwise', () => {
    expect(parseCollectionFlags(['--run', 'r0a']).part).toBe('development');
    expect(parseCollectionFlags(['--run', 'r0a', '--part', 'held-out']).part).toBe('held-out');
  });

  it.each(['place-name', 'r0b', 'title-rule', 'ai-choice'])('wants a saved run for %s', (run) => {
    expect(() => parseCollectionFlags(['--run', run])).toThrow(/--from/u);
  });

  it('lets only the Judgement and the AI call a model', () => {
    expect(mayCallModel({ run: 'judgement', noModel: false })).toBe(true);
    expect(mayCallModel({ run: 'ai-choice', noModel: false })).toBe(true);
    expect(mayCallModel({ run: 'ai-choice', noModel: true })).toBe(false);
    expect(mayCallModel({ run: 'r0b', noModel: false })).toBe(false);
  });
});
