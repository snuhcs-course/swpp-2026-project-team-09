/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { MockLanguageModelV4 } from 'ai/test';
import { type GridFound } from '../src/timetable-reading/grid-mapping.js';
import { MOST_END_REASKS } from '../src/timetable-reading/grid-reading.js';
import { checkedReading } from '../src/timetable-reading/reading-checks.js';
import { MOST_MODEL_CALLS } from '../src/timetable-reading/reading-model.js';
import { readAnswer } from '../src/timetable-reading/timetable-reading.service.js';

// P15-52 review: how many model calls one reading makes, whatever the phone sends, and what a failed second look or
// re-read leaves of a good first reading. The model is a stand-in that answers each call by its instructions.

type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;

const NO_USAGE: Result['usage'] = {
  inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
};

const IMAGE = { data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), mediaType: 'image/png' };
const LIMITS = { timeoutMs: 5000, maxOutputTokens: 1000 };
const AXIS = ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
const DAYS = ['월', '화', '수', '목', '금'];

// 9:00 at y = 300, 100 pixels an hour.
const clockAt = (y: number): string => {
  const minutes = 540 + Math.round(((y - 300) * 60) / 100);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
};

type Kind = 'layout' | 'id' | 'end' | 'text';

function kindOf(instructions: string): Kind {
  if (instructions.includes('read the layout')) {
    return 'layout';
  }
  if (instructions.includes('and where it starts')) {
    return 'id';
  }
  return instructions.includes('Say where the class ends') ? 'end' : 'text';
}

// A stand-in for the model: `answer` gives each call's answer by its kind and the block list it was sent, or an Error
// for a call that fails.
function modelFor(answer: (kind: Kind, list: string) => object | Error): { model: MockLanguageModelV4; calls: Kind[] } {
  const calls: Kind[] = [];
  const model = new MockLanguageModelV4({
    provider: 'reading',
    modelId: 'reading',
    doGenerate: (options): Promise<Result> => {
      const system = options.prompt.find(({ role }) => role === 'system');
      const kind = kindOf(system?.role === 'system' ? system.content : '');
      const user = options.prompt.find(({ role }) => role === 'user');
      const list =
        user?.role === 'user' ? user.content.map((part) => (part.type === 'text' ? part.text : '')).join('') : '';
      calls.push(kind);
      const answered = answer(kind, list);
      return answered instanceof Error
        ? Promise.reject(answered)
        : Promise.resolve({
            content: [{ type: 'text', text: JSON.stringify(answered) }],
            finishReason: { unified: 'stop', raw: undefined },
            usage: NO_USAGE,
            warnings: [],
          });
    },
  });
  return { model, calls };
}

// An hour later than the clock at y.
const later = (y: number): string => clockAt(y + 100);

// Names one character apart, every other block.
const nameOf = (number: number): string => (number % 2 === 0 ? '컴퓨터프로그래밍' : '컴퓨터프로그레밍');

// The numbers of a block list as sent ("1. …\n2. …").
const numbersOf = (list: string): number[] => [...list.matchAll(/^(\d+)\./gmu)].map((match) => Number(match[1]));

// 16 blocks in each of five columns, every half hour from 9:00, each fading 24 minutes in.
const FLOOD: GridFound = {
  columns: 5,
  blocks: Array.from({ length: 80 }, (_, index) => {
    const top = 300 + (index % 16) * 50;
    return { column: Math.floor(index / 16), top, bottom: top + 40, colour: [80, 70, 190], fades: true };
  }),
};

// The model reads every end of FLOOD an hour later than where the colour ends, on the layout and on every re-ask, and
// every start 9 hours off in the text call, with names one character apart, so that every further look is asked for.
function floodAnswer(kind: Kind, list: string): object {
  if (kind === 'layout') {
    return {
      title: null,
      axis: AXIS,
      blocks: FLOOD.blocks.map((block, index) => ({
        number: index + 1,
        day: DAYS[block.column] ?? null,
        start: clockAt(block.top),
        end: later(block.bottom),
      })),
    };
  }
  if (kind === 'end') {
    return { end: '23:55' };
  }
  const room = null;
  const blocks = numbersOf(list).map((number) => {
    const name = nameOf(number);
    return kind === 'id'
      ? { number, start: '6:00', nameLines: [name], name, room }
      : { number, nameLines: [name], name, room };
  });
  return { title: null, blocks };
}

describe('a phone that sends 80 fading blocks with wrong bottoms', () => {
  it(`makes no more than ${MOST_MODEL_CALLS} model calls, asking at most ${MOST_END_REASKS} ends again`, async () => {
    const { model, calls } = modelFor(floodAnswer);
    const { answer } = await readAnswer(model, IMAGE, { grid: FLOOD }, LIMITS);
    expect(calls.length).toBeLessThanOrEqual(MOST_MODEL_CALLS);
    expect(calls.filter((kind) => kind === 'end').length).toBeLessThanOrEqual(MOST_END_REASKS);
    // None of them had an end that held: all left out and counted, none invented.
    const reading = checkedReading(answer);
    expect(reading.kind === 'read' ? [reading.classes.length, reading.leftOut.length] : null).toEqual([0, 80]);
  });
});

// 9:00 at y = 300, 100 pixels an hour: 화 and 목 11:00–12:15, 수 13:00–14:15.
const GRID: GridFound = {
  columns: 5,
  blocks: [
    { column: 1, top: 500, bottom: 625, colour: [80, 70, 190], fades: false },
    { column: 3, top: 500, bottom: 625, colour: [80, 70, 190], fades: false },
    { column: 2, top: 700, bottom: 825, colour: [175, 67, 77], fades: false },
  ],
};

const LAYOUT = {
  title: '1',
  axis: AXIS,
  blocks: [
    { number: 1, day: '화', start: '11:00', end: '12:15' },
    { number: 2, day: '목', start: '11:00', end: '12:15' },
    { number: 3, day: '수', start: '1:00', end: '2:15' },
  ],
};

function idText(names: readonly string[], starts: readonly string[] = ['11:00', '11:00', '13:00']): object {
  return {
    title: '1',
    blocks: names.map((one, index) => ({
      number: index + 1,
      start: starts[index],
      nameLines: [one],
      name: one,
      room: '301-118',
    })),
  };
}

const classesOf = (answer: Awaited<ReturnType<typeof readAnswer>>['answer']): (string | number)[][] => {
  const reading = checkedReading(answer);
  return reading.kind === 'read' ? reading.classes.map(({ name, times }) => [name, times.length]) : [];
};

const reasonsOf = (answer: Awaited<ReturnType<typeof readAnswer>>['answer']): string[] => {
  const reading = checkedReading(answer);
  return reading.kind === 'read' ? reading.leftOut.map(({ reason }) => reason) : [];
};

describe('an ordinary reading', () => {
  it('makes two model calls: the layout and the text', async () => {
    const { model, calls } = modelFor((kind) =>
      kind === 'layout' ? LAYOUT : idText(['회계원리', '회계원리', '논리설계']),
    );
    const { answer } = await readAnswer(model, IMAGE, { grid: GRID }, LIMITS);
    expect(calls.toSorted()).toEqual(['id', 'layout']);
    expect(classesOf(answer)).toEqual([
      ['회계원리', 2],
      ['논리설계', 1],
    ]);
  });
});

describe('a further look that fails', () => {
  it('keeps the first reading when the second look at near-miss names fails, the near misses left out and counted', async () => {
    const { model, calls } = modelFor((kind) =>
      kind === 'layout'
        ? LAYOUT
        : kind === 'id'
          ? idText(['컴퓨터프로그래밍', '컴퓨터프로그레밍', '논리설계'])
          : new Error('overloaded'),
    );
    const { answer } = await readAnswer(model, IMAGE, { grid: GRID }, LIMITS);
    expect(calls.filter((kind) => kind === 'text')).toHaveLength(1);
    expect(classesOf(answer)).toEqual([['논리설계', 1]]);
    expect(reasonsOf(answer)).toEqual(['no-name', 'no-name']);
  });

  it('keeps the first reading when the re-read of a block whose start did not agree fails, that block left out', async () => {
    const { model, calls } = modelFor((kind) =>
      kind === 'layout'
        ? LAYOUT
        : kind === 'id'
          ? idText(['회계원리', '회계원리', '논리설계'], ['11:00', '11:00', '17:00'])
          : new Error('overloaded'),
    );
    const { answer } = await readAnswer(model, IMAGE, { grid: GRID }, LIMITS);
    expect(calls.filter((kind) => kind === 'text')).toHaveLength(1);
    expect(classesOf(answer)).toEqual([['회계원리', 2]]);
    expect(reasonsOf(answer)).toEqual(['no-name']);
  });
});

describe('a reading past its deadline', () => {
  it('makes no model call once the deadline has passed', async () => {
    const { model, calls } = modelFor((kind) =>
      kind === 'layout' ? LAYOUT : idText(['회계원리', '회계원리', '논리설계']),
    );
    const signal = AbortSignal.abort();
    await expect(readAnswer(model, IMAGE, { grid: GRID }, { ...LIMITS, signal })).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});
