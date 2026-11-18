/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import {
  columnDays,
  fitMinutes,
  type GridFound,
  gridListed,
  placedBlocks,
  placedEnd,
} from '../src/timetable-reading/grid-mapping.js';
import { type GridTextAnswer, gridList } from '../src/timetable-reading/reading-model.js';

// P15-52: the label-free grid the phone sends, mapped with what the model read, on answers written here.

// 9:00 at y = 300 and 100 pixels an hour.
const y = (hours: number): number => 300 + (hours - 9) * 100;

const GRID: GridFound = {
  columns: 5,
  blocks: [
    { column: 1, top: y(11), bottom: y(12.25), colour: [80, 70, 190], fades: false },
    { column: 3, top: y(11), bottom: y(12.25), colour: [80, 70, 190], fades: false },
    { column: 4, top: y(14), bottom: y(16 + 50 / 60), colour: [70, 60, 180], fades: false },
    { column: 0, top: y(9), bottom: y(9 + 50 / 60), colour: [210, 120, 60], fades: false },
    { column: 2, top: y(19), bottom: y(20 + 50 / 60), colour: [175, 67, 77], fades: true },
  ],
};

function read(day: string | null, start: string, end: string): Omit<GridTextAnswer['blocks'][number], 'number'> {
  return { day, start, end };
}

// The model's rough reading of the layout on a 12-hour axis: one end an hour off (13:15 for 12:15), 금's label
// hidden, and the fading block's end read.
const TEXT: GridTextAnswer = {
  title: '연습3',
  axis: ['9', '10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8'],
  blocks: [
    { number: 1, ...read('화', '11:00', '12:15') },
    { number: 2, ...read('목', '11:05', '1:15') },
    { number: 3, ...read(null, '2:00', '4:50') },
    { number: 4, ...read('월', '9:00', '9:50') },
    { number: 5, ...read('수', '7:00', '8:50') },
  ],
};

describe('the time from the pixels', () => {
  it('is the line most of the model’s times agree on, whatever one misread', () => {
    const line = fitMinutes([
      { y: y(9), minutes: 540 },
      { y: y(11), minutes: 660 },
      { y: y(12.25), minutes: 735 },
      { y: y(14), minutes: 840 },
      { y: y(12.25), minutes: 795 },
    ]);
    expect(line?.slope).toBeCloseTo(0.6);
    expect((line?.slope ?? 0) * y(16) + (line?.offset ?? 0)).toBeCloseTo(960);
  });

  it('is not pulled by times 5 to 12 minutes off: refitted over the times within 5 minutes of the first fit', () => {
    // Eight times on the hour lines, and two read 10 minutes late: the first fit would be about 2 minutes late.
    const line = fitMinutes([
      ...[9, 10, 11, 12, 13, 14, 15, 16].map((hours) => ({ y: y(hours), minutes: hours * 60 })),
      { y: y(11), minutes: 670 },
      { y: y(12), minutes: 730 },
    ]);
    expect((line?.slope ?? 0) * y(11) + (line?.offset ?? 0)).toBeCloseTo(660);
    expect((line?.slope ?? 0) * y(16) + (line?.offset ?? 0)).toBeCloseTo(960);
  });

  it('is refused when too few times agree', () => {
    expect(
      fitMinutes([
        { y: 1, minutes: 540 },
        { y: 2, minutes: 600 },
      ]),
    ).toBeNull();
  });
});

describe('the days of the columns', () => {
  it('run on from the labels most blocks were read with, a hidden one filled in', () => {
    expect(
      columnDays(
        [
          { column: 0, label: '월' },
          { column: 1, label: '화' },
          { column: 3, label: '목' },
        ],
        5,
      ),
    ).toEqual(['월', '화', '수', '목', '금']);
    expect(columnDays([{ column: 0, label: 'Mon' }], 6)).toEqual(['월', '화', '수', '목', '금', '토']);
  });

  it('are refused when the labels disagree or run past Sunday', () => {
    expect(
      columnDays(
        [
          { column: 0, label: '월' },
          { column: 1, label: '목' },
        ],
        5,
      ),
    ).toBeNull();
    expect(columnDays([{ column: 0, label: '금' }], 5)).toBeNull();
    expect(columnDays([], 5)).toBeNull();
  });
});

describe('a grid read', () => {
  it('lists each block by its column and its place in it', () => {
    expect(gridList(GRID.blocks)).toBe(
      '1. column 2, block 1\n2. column 4, block 1\n3. column 5, block 1\n4. column 1, block 1\n5. column 3, block 1',
    );
  });

  it('places every block from the pixels: the misread end and the hidden day mended, the fading end read', () => {
    const placed = placedBlocks(GRID, TEXT);
    expect(placed).not.toBeNull();
    expect(gridListed(GRID, placed ?? [])).toEqual([
      { day: '화', start: '11:00', end: '12:15', fades: false },
      { day: '목', start: '11:00', end: '12:15', fades: false },
      { day: '금', start: '14:00', end: '16:50', fades: false },
      { day: '월', start: '09:00', end: '09:50', fades: false },
      { day: '수', start: '19:00', end: '20:50', fades: true },
    ]);
    const [fading] = GRID.blocks.slice(-1);
    const place = placed?.at(-1);
    expect(fading !== undefined && place !== undefined ? placedEnd(fading, place) : null).toBe('20:50');
  });

  it('leaves a fading end out when the model reads none in the window', () => {
    const placed = placedBlocks(GRID, {
      ...TEXT,
      blocks: TEXT.blocks.map((block) => (block.number === 5 ? { ...block, end: '11:00' } : block)),
    });
    const [fading] = GRID.blocks.slice(-1);
    const place = placed?.at(-1);
    expect(fading !== undefined && place !== undefined ? placedEnd(fading, place) : 'none').toBeNull();
  });

  it('is refused when the axis is not read, so that the model reads the whole picture', () => {
    expect(placedBlocks(GRID, { ...TEXT, axis: [] })).toBeNull();
  });
});

describe('a line the model’s times do not sit on', () => {
  it('is refused, as when the layout was read without thinking and every time is 10 to 25 minutes off', () => {
    const points = [540, 660, 735, 840, 960, 1020, 1140, 1200].map((minutes, index) => ({
      y: 300 + (minutes - 540) * (5 / 3),
      minutes: minutes + ([0, 12, -10, 11, -9, 10, -11, 9][index] ?? 0),
    }));
    expect(fitMinutes(points)).toBeNull();
  });
});
