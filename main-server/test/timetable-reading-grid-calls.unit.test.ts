/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { MockLanguageModelV4 } from 'ai/test';
import { type GridFound } from '../src/timetable-reading/grid-mapping.js';
import { readGrid } from '../src/timetable-reading/grid-reading.js';
import { checkedReading } from '../src/timetable-reading/reading-checks.js';
import { readAnswer } from '../src/timetable-reading/timetable-reading.service.js';

// P15-52: the calls of a grid reading, with a stand-in for the model that answers each call by its instructions:
// the re-ask of a fading block's end, and the text read at the same time as the layout, checked on the placed starts.

type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;

const NO_USAGE: Result['usage'] = {
  inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
};

// 9:00 at y = 300, 100 pixels an hour: 화 11:00–12:15, 목 11:00–12:15, and 수 from 19:00, fading where its colour ends
// at 20:50.
const GRID: GridFound = {
  columns: 5,
  blocks: [
    { column: 1, top: 500, bottom: 625, colour: [80, 70, 190], fades: false },
    { column: 3, top: 500, bottom: 625, colour: [80, 70, 190], fades: false },
    { column: 2, top: 1300, bottom: 1483.3, colour: [175, 67, 77], fades: true },
  ],
};

const AXIS = ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];

interface Script {
  // The end the layout call reads for the fading block, and the one the re-ask reads.
  layoutEnd: string;
  reaskEnd: string | null;
  // The start the text call reads for block 2, the same time as the layout.
  idStart: string;
}

function named(number: number, name: string, room: string, start: string): object {
  return { number, start, nameLines: [name], name, room };
}

function answerFor(instructions: string, script: Script): object {
  if (instructions.includes('Say where the class ends')) {
    return { end: script.reaskEnd };
  }
  if (instructions.includes('read the layout')) {
    return {
      title: '1',
      axis: AXIS,
      blocks: [
        { number: 1, day: '화', start: '11:00', end: '12:15' },
        { number: 2, day: '목', start: '11:00', end: '12:15' },
        { number: 3, day: '수', start: '19:00', end: script.layoutEnd },
      ],
    };
  }
  if (instructions.includes('and where it starts')) {
    return {
      title: '1',
      blocks: [
        named(1, '회계원리', '58-324', '11:00'),
        named(2, '논리설계', '301-118', script.idStart),
        named(3, '논리설계', '302-310-2', '19:00'),
      ],
    };
  }
  // The text read on placed days and times: the re-read of block 2 alone, or all three.
  return {
    title: '1',
    blocks: [
      { number: 1, nameLines: ['회계원리'], name: '회계원리', room: '58-324' },
      { number: 2, nameLines: ['회계원리'], name: '회계원리', room: '58-324' },
      { number: 3, nameLines: ['논리설계'], name: '논리설계', room: '302-310-2' },
    ],
  };
}

function modelFor(script: Script): { model: MockLanguageModelV4; calls: string[] } {
  const calls: string[] = [];
  const model = new MockLanguageModelV4({
    provider: 'reading',
    modelId: 'reading',
    doGenerate: (options): Promise<Result> => {
      const system = options.prompt.find(({ role }) => role === 'system');
      const instructions = system?.role === 'system' ? system.content : '';
      calls.push(instructions.slice(0, 40));
      return Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(answerFor(instructions, script)) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: NO_USAGE,
        warnings: [],
      });
    },
  });
  return { model, calls };
}

const IMAGE = { data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), mediaType: 'image/png' };
const LIMITS = { timeoutMs: 5000, maxOutputTokens: 1000 };

describe('a fading block whose end the layout did not agree on', () => {
  it('keeps its end when the re-ask agrees with where its colour ends', async () => {
    const { model, calls } = modelFor({ layoutEnd: '21:30', reaskEnd: '20:50', idStart: '11:00' });
    const reading = await readGrid(model, IMAGE, GRID, LIMITS, {
      layoutThinking: true,
      parallel: false,
      fadeReask: true,
    });
    const checked = checkedReading(reading?.answer ?? { title: null, axis: [], blocks: [] });
    expect(calls.filter((call) => call.startsWith('You read one class block'))).toHaveLength(1);
    expect(checked.kind === 'read' ? checked.leftOut : null).toEqual([]);
  });

  it('is left out when the re-ask does not agree either, or is not made', async () => {
    for (const options of [
      { layoutThinking: true, parallel: false, fadeReask: true },
      { layoutThinking: true, parallel: false, fadeReask: false },
    ]) {
      const { model } = modelFor({ layoutEnd: '21:30', reaskEnd: '21:50', idStart: '11:00' });
      // oxlint-disable-next-line no-await-in-loop -- one reading after the other
      const reading = await readGrid(model, IMAGE, GRID, LIMITS, options);
      const checked = checkedReading(reading?.answer ?? { title: null, axis: [], blocks: [] });
      expect(checked.kind === 'read' ? checked.leftOut.map(({ reason }) => reason) : []).toEqual(['cut']);
    }
  });
});

describe('text read at the same time as the layout', () => {
  it('keeps a block’s text whose start agrees, and reads again on its placed day and time a block whose does not', async () => {
    const { model, calls } = modelFor({ layoutEnd: '20:50', reaskEnd: null, idStart: '15:00' });
    const reading = await readGrid(model, IMAGE, GRID, LIMITS, {
      layoutThinking: false,
      parallel: true,
      fadeReask: true,
    });
    const checked = checkedReading(reading?.answer ?? { title: null, axis: [], blocks: [] });
    // Block 2's text was read with a start of 15:00, far from its placed 11:00: re-read, it is 회계원리, not 논리설계.
    expect(checked.kind === 'read' ? checked.classes.map(({ name, times }) => [name, times.length]) : []).toEqual([
      ['회계원리', 2],
      ['논리설계', 1],
    ]);
    expect(calls.filter((call) => call.startsWith('You read the text inside class blocks'))).toHaveLength(2);
  });
});

function fallbackModel(whole: object): { model: MockLanguageModelV4; calls: string[] } {
  const calls: string[] = [];
  const model = new MockLanguageModelV4({
    provider: 'reading',
    modelId: 'reading',
    doGenerate: (options): Promise<Result> => {
      const system = options.prompt.find(({ role }) => role === 'system');
      const instructions = system?.role === 'system' ? system.content : '';
      calls.push(instructions.slice(0, 40));
      const answer = instructions.includes('read the layout')
        ? { title: '1', axis: [], blocks: [] }
        : instructions.includes('report what is printed on it')
          ? whole
          : {
              title: '1',
              blocks: [1, 2].map((number) => ({
                number,
                nameLines: ['컴퓨터프로그래밍'],
                name: '컴퓨터프로그래밍',
                room: '302-105',
              })),
            };
      return Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(answer) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: NO_USAGE,
        warnings: [],
      });
    },
  });
  return { model, calls };
}

describe('the whole picture’s reading when the grid’s mapping is refused', () => {
  // The layout gives no axis, so the mapping is refused; the whole picture's reading then has two near-equal names,
  // and the grid's blocks at the same indexes are of two far colours, which must not reach the check.
  const whole = {
    title: '1',
    axis: ['9', '10', '11', '12'],
    blocks: [
      {
        day: '화',
        start: '11:00',
        end: '12:15',
        nameLines: ['컴퓨터프로그래밍'],
        name: '컴퓨터프로그래밍',
        room: '302-105',
        cut: false,
      },
      {
        day: '목',
        start: '11:00',
        end: '12:15',
        nameLines: ['컴퓨터프로그레밍'],
        name: '컴퓨터프로그레밍',
        room: '302-105',
        cut: false,
      },
    ],
  };
  const grid: GridFound = {
    columns: 5,
    blocks: [
      { column: 1, top: 500, bottom: 625, colour: [250, 200, 40], fades: false },
      { column: 3, top: 500, bottom: 625, colour: [40, 90, 230], fades: false },
    ],
  };

  it('looks again at near-equal names on their names alone, and makes one class of what it reads', async () => {
    const { model, calls } = fallbackModel(whole);
    const { answer, mapped } = await readAnswer(model, IMAGE, { grid }, LIMITS);
    expect(mapped).toBe(false);
    // The second look was asked for, although the grid's colours at those indexes are far apart.
    expect(calls.filter((call) => call.startsWith('You read the text inside class blocks'))).toHaveLength(1);
    const reading = checkedReading(answer);
    expect(reading.kind === 'read' ? reading.classes.map(({ name, times }) => [name, times.length]) : []).toEqual([
      ['컴퓨터프로그래밍', 2],
    ]);
  });
});
