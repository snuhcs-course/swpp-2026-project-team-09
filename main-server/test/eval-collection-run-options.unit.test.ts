/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { mayCallModel, parseCollectionFlags } from '../eval/collection/run-options.ts';

describe('the flags of a run', () => {
  it('reads the development part unless told otherwise', () => {
    expect(parseCollectionFlags(['--run', 'r0a']).part).toBe('development');
    expect(parseCollectionFlags(['--run', 'r0a', '--part', 'held-out']).part).toBe('held-out');
  });

  it('leaves the provider and the caching mode to the settings unless told', () => {
    expect(parseCollectionFlags(['--run', 'r0a'])).toMatchObject({ provider: undefined, cache: undefined });
    expect(parseCollectionFlags(['--run', 'r0a', '--provider', 'openrouter', '--cache', 'off'])).toMatchObject({
      provider: 'openrouter',
      cache: 'off',
    });
  });

  it.each([
    ['--provider', 'claude'],
    ['--cache', 'on'],
  ])('refuses %s %s', (flag, value) => {
    expect(() => parseCollectionFlags(['--run', 'r0a', flag, value])).toThrow();
  });

  it.each(['r0b', 'title-rule', 'ai-choice'])('wants a saved run for %s', (run) => {
    expect(() => parseCollectionFlags(['--run', run])).toThrow(/--from/u);
  });

  it('lets only the Judgement and the AI call a model', () => {
    expect(mayCallModel({ run: 'judgement', noModel: false })).toBe(true);
    expect(mayCallModel({ run: 'ai-choice', noModel: false })).toBe(true);
    expect(mayCallModel({ run: 'ai-choice', noModel: true })).toBe(false);
    expect(mayCallModel({ run: 'r0b', noModel: false })).toBe(false);
  });
});
