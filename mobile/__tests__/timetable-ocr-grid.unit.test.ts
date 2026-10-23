/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { endIsUncertain, findBlocks, splitAtSeparators } from '@/features/timetable-ocr/blocks';
import { columnsFromGridLines, findHeader } from '@/features/timetable-ocr/grid';
import { fitHourLabels, type HourLabel, hoursAt, unfoldHours, wrapCandidates } from '@/features/timetable-ocr/hours';
import { readTimetable } from '@/features/timetable-ocr/read-timetable';
import { wordsOf } from '@/features/timetable-ocr/words';

import {
  Canvas,
  COLUMN,
  gridCanvas,
  HEIGHT,
  headerLines,
  HOUR,
  LEFT,
  line,
  rowOf,
  screenshot,
  TOP,
} from './support/timetable-ocr-synthetic';

// The pixel steps of the timetable reading pipeline on drawn timetables: the hour labels' fit, the columns, the
// blocks and their ends.

const BLUE: [number, number, number] = [73, 150, 225];
const TEAL: [number, number, number] = [97, 204, 199];
const HEADER = findHeader(wordsOf(screenshot([])), 330);
const HEADER_COLUMNS = HEADER?.columns ?? [];
const HEADER_BOTTOM = HEADER?.bottom ?? 0;

// Labels at 40 pixels an hour, 9:00 on row 120, each a little below its hour's line.
function labels(hours: readonly number[], misread: Record<number, number> = {}): HourLabel[] {
  return hours.map((hour, index) => ({
    hour: misread[index] ?? hour,
    y: TOP + (index + (hours[0] ?? 9) - 9) * HOUR + 9,
    top: 0,
  }));
}

describe('the hour labels', () => {
  it('unfold 12-hour labels at the first one smaller than the label above, and leave 24-hour ones', () => {
    const twelve = [9, 10, 11, 12, 1, 2, 3];
    expect(wrapCandidates(twelve)).toEqual([4]);
    expect(unfoldHours(twelve, 4)).toEqual([9, 10, 11, 12, 13, 14, 15]);
    expect(wrapCandidates([9, 10, 11, 12, 13, 14])).toEqual([]);
  });

  it('give the same fit in 12 and 24 hours', () => {
    const twelve = fitHourLabels(labels([9, 10, 11, 12, 1, 2, 3, 4, 5, 6]), HEIGHT);
    const twentyFour = fitHourLabels(labels([9, 10, 11, 12, 13, 14, 15, 16, 17, 18]), HEIGHT);
    expect(twelve?.fit.line.a).toBeCloseTo(twentyFour?.fit.line.a ?? 0, 6);
    expect(twelve?.fit.line.b).toBeCloseTo(twentyFour?.fit.line.b ?? 0, 6);
    expect(twentyFour?.fit.line.a).toBeCloseTo(HOUR, 6);
  });

  it('are fitted by RANSAC so that one misread label moves no hour by more than 5 minutes', () => {
    const cases = [
      // 13 read as 18 in 24 hours.
      fitHourLabels(labels([9, 10, 11, 12, 13, 14, 15, 16], { 4: 18 }), HEIGHT),
      // 1 read as 7 in 12 hours, where it would also be the wrap.
      fitHourLabels(labels([9, 10, 11, 12, 1, 2, 3, 4], { 4: 7 }), HEIGHT),
      // 3 read as 8 in 12 hours.
      fitHourLabels(labels([9, 10, 11, 12, 1, 2, 3, 4], { 6: 8 }), HEIGHT),
    ];
    for (const fitted of cases) {
      expect(fitted).not.toBeNull();
      for (let hour = 9; hour <= 21; hour += 1) {
        const y = TOP + (hour - 9) * HOUR + 9;
        expect(Math.abs((fitted ? hoursAt(fitted.fit.line, y) : 0) - hour) * 60).toBeLessThanOrEqual(5);
      }
    }
  });

  it('need at least three that agree', () => {
    expect(fitHourLabels(labels([9, 10]), HEIGHT)).toBeNull();
    expect(fitHourLabels(labels([9, 10, 11]), HEIGHT)).not.toBeNull();
  });
});

describe('the columns', () => {
  it('come from the day header, a letter not read filled in from the others', () => {
    const words = wordsOf(screenshot([], headerLines(['월', '수', '목', '금'])));
    const header = findHeader(words, 330);
    expect(header?.columns.map((column) => column.weekday)).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]);
    header?.columns.forEach((column, index) => {
      expect(column.left).toBeCloseTo(LEFT + index * COLUMN, 0);
      expect(column.right).toBeCloseTo(LEFT + (index + 1) * COLUMN, 0);
    });
  });

  it('take 토 when the header has it', () => {
    const words = wordsOf(screenshot([], headerLines(['월', '화', '수', '목', '금', '토'])));
    expect(findHeader(words, 330)?.columns.at(-1)?.weekday).toBe('saturday');
  });

  it('come from the vertical grid lines when the header is missing', () => {
    const columns = columnsFromGridLines(gridCanvas().image(), 72, 645);
    expect(columns?.map((column) => [column.weekday, column.left, column.right])).toEqual(
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day, index) => [
        day,
        LEFT + index * COLUMN,
        LEFT + (index + 1) * COLUMN,
      ]),
    );
  });

  it('and a picture without a timetable has none', () => {
    expect(readTimetable(screenshot([], [line('안녕하세요', 40, 300)], new Canvas()), []).kind).toBe('none');
  });
});

describe('the blocks', () => {
  it('are cut at a column edge: two same-coloured blocks side by side become two', () => {
    const canvas = gridCanvas();
    // 근장 on 수 and 목, one colour, touching across the column edge.
    canvas.fill(LEFT + 2 * COLUMN + 1, rowOf(16), LEFT + 4 * COLUMN, rowOf(18), TEAL);
    const blocks = findBlocks(canvas.image(), HEADER_COLUMNS, HOUR, HEADER_BOTTOM);
    expect(blocks.map((block) => [block.column.weekday, block.y0, block.y1])).toEqual([
      ['wednesday', rowOf(16), rowOf(18)],
      ['thursday', rowOf(16), rowOf(18)],
    ]);
  });

  it('stacked in one colour are split at a thin lighter line', () => {
    const canvas = gridCanvas();
    const x0 = LEFT + 1;
    canvas.fill(x0, rowOf(10), x0 + COLUMN - 1, rowOf(13), BLUE);
    canvas.fill(x0, rowOf(11.5), x0 + COLUMN - 1, rowOf(11.5) + 1, [160, 200, 240]);
    expect(splitAtSeparators(canvas.image(), { x0, x1: x0 + COLUMN - 1, y0: rowOf(10), y1: rowOf(13) })).toEqual([
      rowOf(11.5),
    ]);
    const blocks = findBlocks(canvas.image(), HEADER_COLUMNS, HOUR, HEADER_BOTTOM);
    expect(blocks.map((block) => [block.y0, block.y1])).toEqual([
      [rowOf(10), rowOf(11.5)],
      [rowOf(11.5) + 1, rowOf(13)],
    ]);
  });
});

describe('stacked blocks and a block’s end', () => {
  it('stacked in one colour with no line are split where their text falls into two groups of one name', () => {
    const result = screenshot([{ day: 0, start: 10, end: 13, colour: BLUE, text: [] }]);
    result.lines.push(line('수학 1', LEFT + 4, rowOf(10) + 3), line('수학 1', LEFT + 4, rowOf(11.5) + 3));
    const reading = readTimetable(result, []);
    expect(reading.kind === 'read' ? reading.classes : []).toEqual([
      {
        name: '수학 1',
        times: [
          { weekday: 'monday', start: '10:00', end: '11:30', room: null, placeId: null },
          { weekday: 'monday', start: '11:30', end: '13:00', room: null, placeId: null },
        ],
      },
    ]);
  });

  it('that fade out at the bottom, or reach the picture’s end, have an uncertain end', () => {
    const canvas = gridCanvas();
    const x0 = LEFT + 1;
    canvas.fill(x0, rowOf(10), x0 + COLUMN - 1, rowOf(11), BLUE);
    for (let step = 0; step < 15; step += 1) {
      canvas.fill(x0, rowOf(11) - 15 + step, x0 + COLUMN - 1, rowOf(11) - 14 + step, [
        73 + step * 3,
        150 + step * 2,
        225,
      ]);
    }
    canvas.fill(x0 + COLUMN, rowOf(10), x0 + 2 * COLUMN - 1, rowOf(11), BLUE);
    canvas.fill(x0 + 2 * COLUMN, rowOf(19), x0 + 3 * COLUMN - 1, HEIGHT, BLUE);
    const image = canvas.image();
    const blocks = findBlocks(image, HEADER_COLUMNS, HOUR, HEADER_BOTTOM);
    expect(blocks.map((block) => [block.column.weekday, endIsUncertain(image, block)])).toEqual([
      ['monday', true],
      ['tuesday', false],
      ['wednesday', true],
    ]);
  });
});
