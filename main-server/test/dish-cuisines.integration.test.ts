/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { MockLanguageModelV4 } from 'ai/test';
import { Server } from 'node:http';
import { inject, vi } from 'vitest';
import { type MenusService } from '../src/menus/menus.service.js';
import { daysOf, menusMessage, restaurant } from './menus.js';
import { startApp } from './start-app.js';
import { sendAsWorker } from './worker.js';

// The kind of food of each dish, read by the model once when a collected menu first holds its name, after the worker
// has its answer. Only this file turns DISH_CUISINES on, and its names are its own: the kinds are kept by name for every
// file that shares the database.

type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;
type CallOptions = MockLanguageModelV4['doGenerateCalls'][number];

const KINDS: Record<string, string> = {
  시험짜장면: 'chinese',
  시험돈코츠라멘: 'japanese',
  시험깍두기: 'none',
  시험떡볶이: 'snack',
  시험새우볶음밥: 'chinese',
};

function namesOf({ prompt }: CallOptions): string[] {
  const message = prompt.findLast(({ role }) => role === 'user');
  const content = message?.role === 'user' ? message.content : [];
  const text = content.map((part) => (part.type === 'text' ? part.text : '')).join('');
  return text.split('\n').map((line) => line.replace(/^\d+\. /u, ''));
}

// Answers each name its kind in KINDS, or fails while `failing` holds.
class CuisinesModel {
  failing = false;

  readonly model = new MockLanguageModelV4({
    doGenerate: (options): Promise<Result> => {
      if (this.failing) {
        return Promise.reject(new Error('The provider failed'));
      }
      const dishes = namesOf(options).map((name, index) => ({ number: index + 1, cuisine: KINDS[name] ?? 'none' }));
      return Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify({ dishes }) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: {
          inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: undefined, text: undefined, reasoning: undefined },
        },
        warnings: [],
      });
    },
  });

  // The names each call was asked, in order.
  asked(): string[][] {
    return this.model.doGenerateCalls.map((call) => namesOf(call));
  }
}

const cuisines = new CuisinesModel();
let app: INestApplication<Server>;
let menus: MenusService;

beforeAll(async () => {
  app = await startApp({ ...inject('settings'), DISH_CUISINES: 'on' }, [], undefined, cuisines.model);
  // The app's own, loaded after its settings.
  menus = app.get((await import('../src/menus/menus.service.js')).MenusService);
});

afterAll(() => app.close());

const newDay = daysOf('2088-03');

const dish = (name: string): object => ({ meal: 'lunch', text: `${name} : 6,000원`, kind: 'dish', name, price: 6000 });

const NOTE = { meal: 'lunch', text: '※ 운영시간 : 11:00~14:30', kind: 'note', name: null, price: null };

async function collect(date: string, names: readonly string[]): Promise<void> {
  const lines = [...names.map((name) => dish(name)), NOTE];
  await sendAsWorker(app, '/menus/collected', menusMessage([{ date, restaurants: [restaurant({ lines })] }]));
}

// The kept kind of food of each name, as a meal Plan and a menu Lookup read it; undefined for a name not read.
async function kindsOf(...names: string[]): Promise<(string | null | undefined)[]> {
  const kept = await menus.cuisinesOf(names.map((name) => ({ text: name, kind: null, name, price: null })));
  return names.map((name) => kept.get(name));
}

describe("A collected menu's dishes", () => {
  it('are read once after the worker has its answer, each kept with its kind of food or none', async () => {
    await collect(newDay(), ['시험짜장면', '시험돈코츠라멘', '시험깍두기']);

    await vi.waitFor(async () => {
      expect(await kindsOf('시험짜장면', '시험돈코츠라멘', '시험깍두기')).toEqual(['중식', '일식', null]);
    });
    expect(cuisines.asked()).toContainEqual(['시험짜장면', '시험돈코츠라멘', '시험깍두기']);
  });

  it('asks the model only the names it has not read', async () => {
    await collect(newDay(), ['시험짜장면', '시험돈코츠라멘']);
    await vi.waitFor(async () => {
      expect(await kindsOf('시험짜장면', '시험돈코츠라멘')).toEqual(['중식', '일식']);
    });
    const calls = cuisines.asked().length;

    await collect(newDay(), ['시험짜장면', '시험떡볶이']);

    await vi.waitFor(async () => {
      expect(await kindsOf('시험떡볶이')).toEqual(['분식']);
    });
    expect(cuisines.asked().slice(calls)).toEqual([['시험떡볶이']]);
  });
});

describe('A failed reading', () => {
  it('keeps the collection and no kind, and the names are read with the next collection', async () => {
    cuisines.failing = true;
    const calls = cuisines.asked().length;
    const date = newDay();
    await collect(date, ['시험새우볶음밥']);
    await vi.waitFor(() => {
      expect(cuisines.asked()).toHaveLength(calls + 1);
    });

    expect(await kindsOf('시험새우볶음밥')).toEqual([undefined]);

    cuisines.failing = false;
    await collect(date, ['시험새우볶음밥']);

    await vi.waitFor(async () => {
      expect(await kindsOf('시험새우볶음밥')).toEqual(['중식']);
    });
    expect(cuisines.asked().slice(calls)).toEqual([['시험새우볶음밥'], ['시험새우볶음밥']]);
  });
});
