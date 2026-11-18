/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { MockLanguageModelV4 } from 'ai/test';
import { type GridFound } from '../src/timetable-reading/grid-mapping.js';
import { readGrid } from '../src/timetable-reading/grid-reading.js';

// P15-52 review: the layout call and the text call run at the same time, and neither may be left with a rejection
// nobody observes, which would end the server's process. Each call of the fake model waits until the test settles it.

type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;

const NO_USAGE: Result['usage'] = {
  inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
};

const GRID: GridFound = {
  columns: 5,
  blocks: [
    { column: 1, top: 500, bottom: 625, colour: [80, 70, 190], fades: false },
    { column: 3, top: 500, bottom: 625, colour: [80, 70, 190], fades: false },
  ],
};

const IMAGE = { data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), mediaType: 'image/png' };
const LIMITS = { timeoutMs: 5000, maxOutputTokens: 1000 };
const OPTIONS = { layoutThinking: true, parallel: true, fadeReask: true };

const LAYOUT = {
  title: '1',
  axis: ['9', '10', '11', '12', '13', '14'],
  blocks: [
    { number: 1, day: '화', start: '11:00', end: '12:15' },
    { number: 2, day: '목', start: '11:00', end: '12:15' },
  ],
};

const TEXT = {
  title: '1',
  blocks: [1, 2].map((number) => ({ number, nameLines: ['회계원리'], name: '회계원리', room: '58-324' })),
};

interface Pending {
  kind: 'layout' | 'id' | 'text';
  settle: (answer: object | Error) => void;
}

// A model whose calls wait: each is listed in `pending`, by kind, until the test answers or fails it.
function waitingModel(): { model: MockLanguageModelV4; pending: Pending[] } {
  const pending: Pending[] = [];
  const model = new MockLanguageModelV4({
    provider: 'reading',
    modelId: 'reading',
    doGenerate: (options): Promise<Result> => {
      const system = options.prompt.find(({ role }) => role === 'system');
      const instructions = system?.role === 'system' ? system.content : '';
      const kind = instructions.includes('read the layout')
        ? 'layout'
        : instructions.includes('and where it starts')
          ? 'id'
          : 'text';
      return new Promise((resolve, reject) => {
        const settle = (answer: object | Error): void => {
          if (answer instanceof Error) {
            reject(answer);
            return;
          }
          resolve({
            content: [{ type: 'text', text: JSON.stringify(answer) }],
            finishReason: { unified: 'stop', raw: undefined },
            usage: NO_USAGE,
            warnings: [],
          });
        };
        pending.push({ kind, settle });
        options.abortSignal?.addEventListener('abort', () => {
          reject(new Error('aborted'));
        });
      });
    },
  });
  return { model, pending };
}

// Lets the promises in flight run on.
async function flush(): Promise<void> {
  for (let round = 0; round < 20; round += 1) {
    // oxlint-disable-next-line no-await-in-loop -- one turn of the event loop after another
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
}

function settleAll(pending: readonly Pending[], kind: Pending['kind'], answer: object | Error): void {
  for (const one of pending.filter((call) => call.kind === kind)) {
    one.settle(answer);
  }
}

const unhandled: unknown[] = [];
const listen = (reason: unknown): void => {
  unhandled.push(reason);
};

beforeEach(() => {
  unhandled.length = 0;
  process.on('unhandledRejection', listen);
});

afterEach(() => {
  process.off('unhandledRejection', listen);
});

describe('a failed call of a grid reading', () => {
  it('(a) the text call fails while the layout is pending: the text is read after the layout, and nothing is left unhandled', async () => {
    const { model, pending } = waitingModel();
    const reading = readGrid(model, IMAGE, GRID, LIMITS, OPTIONS);
    await flush();
    settleAll(pending, 'id', new Error('The provider failed'));
    await flush();
    settleAll(pending, 'layout', LAYOUT);
    await flush();
    settleAll(pending, 'text', TEXT);
    const done = await reading;
    await flush();
    expect(done?.answer.blocks.map(({ name }) => name)).toEqual(['회계원리', '회계원리']);
    expect(unhandled).toEqual([]);
  });

  it('(b) the layout fails first: the reading fails (the route answers 503), the text call is aborted and handled', async () => {
    const { model, pending } = waitingModel();
    const reading = readGrid(model, IMAGE, GRID, LIMITS, OPTIONS);
    const failed = reading.then(
      () => 'read',
      () => 'failed',
    );
    await flush();
    settleAll(pending, 'layout', new Error('The provider failed'));
    await flush();
    // Whatever the text call does after, its end is observed.
    settleAll(pending, 'id', new Error('The provider failed too'));
    await flush();
    expect(await failed).toBe('failed');
    expect(unhandled).toEqual([]);
  });

  it('(c) the layout does not place the blocks: the reading is refused for the whole picture, the text call handled', async () => {
    const { model, pending } = waitingModel();
    const reading = readGrid(model, IMAGE, GRID, LIMITS, OPTIONS);
    await flush();
    settleAll(pending, 'layout', { ...LAYOUT, axis: [] });
    await flush();
    settleAll(pending, 'id', new Error('The provider failed'));
    expect(await reading).toBeNull();
    await flush();
    expect(unhandled).toEqual([]);
  });
});
