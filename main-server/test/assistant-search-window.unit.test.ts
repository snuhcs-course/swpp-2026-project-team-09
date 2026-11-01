/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { daysTogether, hasWindow, inOrder, windowOf, windowWords } from '../src/assistant/tools/search-window.js';

const korea = (time: string): Date => new Date(`${time}+09:00`);

describe('windowOf', () => {
  it.each([
    ['whole days', { from: '2026-11-02', to: '2026-11-03' }, '2026-11-02T00:00', '2026-11-04T00:00'],
    ['only after', { after: '2026-11-02T17:00' }, '2026-11-02T17:00', '2026-11-03T00:00'],
    ['only before', { before: '2026-11-02T12:00' }, '2026-11-02T00:00', '2026-11-02T12:01'],
    [
      'after and before',
      { after: '2026-11-02T15:00', before: '2026-11-02T18:00' },
      '2026-11-02T15:00',
      '2026-11-02T18:01',
    ],
    [
      'after over from',
      { from: '2026-11-02', to: '2026-11-08', after: '2026-11-02T17:00' },
      '2026-11-02T17:00',
      '2026-11-09T00:00',
    ],
    [
      'seconds, to the minute',
      { after: '2026-11-02T17:00:30', before: '2026-11-02T18:00:30' },
      '2026-11-02T17:00',
      '2026-11-02T18:01',
    ],
  ])('reads %s as [from, to) in Korea', (_, conditions, from, to) => {
    expect(windowOf(conditions)).toEqual({ from: korea(`${from}:00`), to: korea(`${to}:00`) });
  });

  it.each(['2026-11-02T17:00:00+09:00', '2026-11-02T08:00:00Z', '2026-11-02T04:00:00-04:00'])(
    'reads %s in its zone, as the same minute in Korea',
    (after) => {
      expect(windowOf({ after })).toEqual({ from: korea('2026-11-02T17:00:00'), to: korea('2026-11-03T00:00:00') });
    },
  );

  it('gives none without an end', () => {
    expect(windowOf({})).toBeUndefined();
    expect(hasWindow({})).toBe(false);
    expect(windowWords({})).toBe('');
  });
});

describe('the rules of a window', () => {
  it('takes from and to only together', () => {
    expect(daysTogether({ from: '2026-11-02', to: '2026-11-02' })).toBe(true);
    expect(daysTogether({ from: '2026-11-02' })).toBe(false);
  });

  it('refuses a window that ends before it starts', () => {
    expect(inOrder({ after: '2026-11-02T17:00', before: '2026-11-02T17:00' })).toBe(true);
    expect(inOrder({ after: '2026-11-02T18:00', before: '2026-11-02T17:00' })).toBe(false);
    expect(inOrder({ from: '2026-11-03', to: '2026-11-02' })).toBe(false);
  });

  it('says the window in its minutes', () => {
    expect(windowWords({ after: '2026-11-02T17:00' })).toBe(' from 2026-11-02T17:00 to 2026-11-02T23:59');
  });
});
