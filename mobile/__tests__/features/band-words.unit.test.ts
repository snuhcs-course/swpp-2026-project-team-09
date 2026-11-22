/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { shortenedOf } from '@/features/assistant/band-words';

// The time bar's words shortened before they are cut (P04 ticket 37): first without the length, then without the
// meal's name too. Expected values: the longest words the bar writes, seen on a phone 360 wide on 26.11.22-17.
const DAY = '내일(월) 점심';
const LONG = [{ text: '11:03–12:15 · 식사 1시간 12분', strong: false }];

// Partitions: each step; a dragged end's strong part; a meeting's 함께; a clash's words, whose tail is no length; a day
// without a meal.
describe('shortenedOf', () => {
  it('keeps the words whole at step 0', () => {
    expect(shortenedOf(DAY, LONG, 0)).toEqual({ day: DAY, parts: LONG });
  });

  it('drops the length first', () => {
    expect(shortenedOf(DAY, LONG, 1)).toEqual({ day: DAY, parts: [{ text: '11:03–12:15', strong: false }] });
  });

  it("then drops the meal's name too", () => {
    expect(shortenedOf(DAY, LONG, 2)).toEqual({ day: '내일(월)', parts: [{ text: '11:03–12:15', strong: false }] });
  });

  it("keeps a dragged end's strong part while dropping the length", () => {
    const dragged = [
      { text: '11:03–', strong: false },
      { text: '12:15', strong: true },
      { text: ' · 식사 72분', strong: false },
    ];

    expect(shortenedOf(DAY, dragged, 1).parts).toEqual([
      { text: '11:03–', strong: false },
      { text: '12:15', strong: true },
    ]);
  });

  it("drops a meeting's 함께 as its length", () => {
    expect(shortenedOf('', [{ text: '12:15–12:43 · 함께 28분', strong: false }], 1).parts).toEqual([
      { text: '12:15–12:43', strong: false },
    ]);
  });

  it('keeps who cannot come, which is no length', () => {
    const clash = [{ text: '12:20–12:48 · 민수가 안 돼요', strong: false }];

    expect(shortenedOf('', clash, 2).parts).toEqual(clash);
  });

  it('keeps a day without a meal', () => {
    expect(shortenedOf('내일(월)', LONG, 2).day).toBe('내일(월)');
  });
});
