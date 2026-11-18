/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { gridGeometry } from '@/features/timetable-ocr/grid-geometry';
import type { OcrPixels } from '@/features/timetable-ocr/native-ocr';

import everytime1 from '../../main-server/eval/timetable-reading/grids/everytime-1.json';
import snutt1 from '../../main-server/eval/timetable-reading/grids/snutt-1.json';
import snutt2 from '../../main-server/eval/timetable-reading/grids/snutt-2.json';
import snutt3 from '../../main-server/eval/timetable-reading/grids/snutt-3.json';
import everytime2 from '../../main-server/eval/timetable-reading/grids/everytime-2.json';
import everytimeDark1 from '../../main-server/eval/timetable-reading/grids/everytime-dark-1.json';
import snutt4 from '../../main-server/eval/timetable-reading/grids/snutt-4.json';
import snuttDark1 from '../../main-server/eval/timetable-reading/grids/snutt-dark-1.json';
import snuttGrey1 from '../../main-server/eval/timetable-reading/grids/snutt-grey-1.json';
import { ocrOutput, SCREENSHOTS, truth } from './support/timetable-ocr';
import { BLUE, COLUMN, GREEN, gridCanvas, LEFT, ORANGE, rowOf } from './support/timetable-ocr-synthetic';
import { gridOnly, NEW_SCREENSHOTS, newTruth } from './support/timetable-ocr-new';

// P15-52: the grid the phone sends with a screenshot (`gridGeometry`), from the picture's small copy alone: no ML Kit
// text and no hand-placed label is used. On the nine screenshots it finds every class block, and marks the three that
// fade out behind SNUTT's tab bar; what it gives is what the server's experiment and tests read
// (`main-server/eval/timetable-reading/grids/<name>.json`).

const SAVED: Record<string, unknown> = {
  'everytime-1': everytime1,
  'snutt-1': snutt1,
  'snutt-2': snutt2,
  'snutt-3': snutt3,
  'everytime-2': everytime2,
  'everytime-dark-1': everytimeDark1,
  'snutt-4': snutt4,
  'snutt-dark-1': snuttDark1,
  'snutt-grey-1': snuttGrey1,
};

const FADING: Record<string, number> = { 'snutt-2': 1, 'snutt-3': 1, 'snutt-grey-1': 1 };

const CASES: [string, OcrPixels, number][] = [
  ...SCREENSHOTS.map((name): [string, OcrPixels, number] => [name, ocrOutput(name).pixels, truth(name).times.length]),
  ...NEW_SCREENSHOTS.map((name): [string, OcrPixels, number] => [
    name,
    gridOnly(name).pixels,
    newTruth(name).times.length,
  ]),
];

describe.each(CASES)('the grid of %s', (name, pixels, count) => {
  it('holds every class block, the fading ones marked, as saved for the server', () => {
    const grid = gridGeometry(pixels);
    expect(grid?.blocks).toHaveLength(count);
    expect(grid?.blocks.filter(({ fades }) => fades)).toHaveLength(FADING[name] ?? 0);
    expect({ columns: grid?.columns, blocks: grid?.blocks }).toEqual(SAVED[name]);
    expect(grid?.skipped).toEqual([]);
  });
});

describe('a drawn grid with two classes side by side', () => {
  it('sends the whole blocks and keeps the side-by-side ones back, counted', () => {
    const canvas = gridCanvas();
    const fill = (
      day: number,
      start: number,
      end: number,
      colour: [number, number, number],
      from = 0,
      to = 1,
    ): void => {
      const x0 = LEFT + day * COLUMN + 1;
      canvas.fill(x0 + (COLUMN - 1) * from, rowOf(start), x0 + (COLUMN - 1) * to, rowOf(end), colour);
    };
    fill(0, 10, 11.25, BLUE);
    fill(1, 13, 14.25, GREEN);
    fill(2, 9, 10, ORANGE);
    fill(3, 15, 16.5, GREEN, 0, 0.48);
    fill(3, 15, 16.5, BLUE, 0.52, 1);
    const grid = gridGeometry({ width: 330, height: canvas.height, scale: 1, rgba: canvas.base64() });
    expect(grid?.blocks.map(({ column }) => column)).toEqual([0, 1, 2]);
    expect(grid?.skipped.map(({ column, reason }) => `${column} ${reason}`)).toEqual(['3 too-narrow', '3 too-narrow']);
  });
});
