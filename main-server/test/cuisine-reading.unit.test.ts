/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MockLanguageModelV4 } from 'ai/test';
import { cuisineParts, NAMES_PER_CALL, readCuisines } from '../src/menus/cuisine-reading.js';

// The kinds of food of dish names, read over a stand-in model: each answer is taken by its number, and what is not one
// of the kinds is left unread.

type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;

const LIMITS = { timeoutMs: 1000, maxOutputTokens: 100 };

function answering(dishes: { number: number; cuisine: string }[]): MockLanguageModelV4 {
  const result: Result = {
    content: [{ type: 'text', text: JSON.stringify({ dishes }) }],
    finishReason: { unified: 'stop', raw: undefined },
    usage: {
      inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: undefined, text: undefined, reasoning: undefined },
    },
    warnings: [],
  };
  return new MockLanguageModelV4({ doGenerate: () => Promise.resolve(result) });
}

const NAMES = ['부대짬뽕&군만두', '돈코츠라멘&일본풍감자고로케', '깍두기', '볼로네제치즈파스타'];

describe('readCuisines', () => {
  it('takes each answer by its number, and none as no kind', async () => {
    const model = answering([
      { number: 1, cuisine: 'chinese' },
      { number: 2, cuisine: 'japanese' },
      { number: 3, cuisine: 'none' },
      { number: 4, cuisine: 'Western' },
    ]);

    expect(await readCuisines(model, NAMES, LIMITS)).toEqual(
      new Map([
        ['부대짬뽕&군만두', 'chinese'],
        ['돈코츠라멘&일본풍감자고로케', 'japanese'],
        ['깍두기', null],
        ['볼로네제치즈파스타', 'western'],
      ]),
    );
  });

  it('gives the model the names numbered', async () => {
    const model = answering([]);

    await readCuisines(model, NAMES, LIMITS);

    const prompt = JSON.stringify(model.doGenerateCalls[0]?.prompt);
    expect(prompt).toContain('1. 부대짬뽕&군만두');
    expect(prompt).toContain('4. 볼로네제치즈파스타');
    expect(prompt).toContain('snack (분식');
  });

  it('leaves unread a name answered with another word, a number of no name, and a second answer', async () => {
    const model = answering([
      { number: 1, cuisine: '중식' },
      { number: 9, cuisine: 'korean' },
      { number: 2, cuisine: 'japanese' },
      { number: 2, cuisine: 'korean' },
    ]);

    expect(await readCuisines(model, NAMES, LIMITS)).toEqual(new Map([['돈코츠라멘&일본풍감자고로케', 'japanese']]));
  });
});

describe('cuisineParts', () => {
  it('cuts 250 names into ten parts of 25, in their order', () => {
    const names = Array.from({ length: 250 }, (_, index) => `요리${index}`);

    const parts = cuisineParts(names);

    expect(NAMES_PER_CALL).toBe(25);
    expect(parts.map((part) => part.length)).toEqual(Array.from({ length: 10 }, () => 25));
    expect(parts.flat()).toEqual(names);
  });

  it('leaves the rest in a last, shorter part, and makes none of no names', () => {
    expect(cuisineParts(Array.from({ length: 26 }, (_, index) => `요리${index}`)).map((part) => part.length)).toEqual([
      25, 1,
    ]);
    expect(cuisineParts([])).toEqual([]);
  });
});
