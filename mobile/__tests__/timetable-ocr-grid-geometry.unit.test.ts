/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by fyoon46
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
import { BLUE, COLUMN, DARK, GREEN, gridCanvas, LEFT, ORANGE, rowOf } from './support/timetable-ocr-synthetic';
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

// P05 ticket 90: a block whose letters cover most of its rows, as a long name over eight lines does (에브리타임, dark).
// The letters' edges blend the block's colour with white, so the mean of most rows is lighter than the block's fill;
// the clean rows at its top and bottom must still read as its own colour, not as a fade, and it is one block.
const TEAL: [number, number, number] = [88, 192, 182];
const BLEND: [number, number, number] = [172, 224, 219];
const WHITE: [number, number, number] = [255, 255, 255];

// Friday 13:00–15:50 at the picture's right edge, with eight lines of letters from its fourth row to its fourth last.
function lettered(): ReturnType<typeof gridCanvas> {
  const canvas = gridCanvas(5, DARK);
  const x0 = LEFT + 4 * COLUMN + 1;
  const [top, bottom] = [Math.round(rowOf(13)), Math.round(rowOf(15 + 50 / 60))];
  canvas.fill(x0, top, x0 + COLUMN - 1, bottom, TEAL);
  for (let y = top + 4; y < bottom - 4; y += 1) {
    if ((y - top - 4) % 14 < 10) {
      for (let x = x0 + 6; x < x0 + COLUMN - 7; x += 1) {
        const at = (x + y) % 5;
        canvas.set(x, y, at < 2 ? BLEND : at === 2 ? WHITE : TEAL);
      }
    }
  }
  return canvas;
}

// Thursday 11:00–12:15 with a bold line from its middle down: nearly half of each of those rows blends with white.
function boldLine(): ReturnType<typeof gridCanvas> {
  const canvas = gridCanvas(5, DARK);
  const x0 = LEFT + 3 * COLUMN + 1;
  const [top, bottom] = [Math.round(rowOf(11)), Math.round(rowOf(12.25))];
  canvas.fill(x0, top, x0 + COLUMN - 1, bottom, TEAL);
  for (let y = top + 25; y < bottom - 5; y += 1) {
    for (let x = x0; x < x0 + 28; x += 1) {
      canvas.set(x, y, BLEND);
    }
  }
  return canvas;
}

describe('a drawn block with a bold line over half its rows', () => {
  it('is one block, not cut in two where its letters begin', () => {
    const canvas = boldLine();
    const grid = gridGeometry({ width: 330, height: canvas.height, scale: 1, rgba: canvas.base64() });

    expect(grid?.blocks.map(({ column, top, bottom, fades }) => [column, top, bottom, fades])).toEqual([
      [3, Math.round(rowOf(11)), Math.round(rowOf(12.25)), false],
    ]);
  });
});

describe('a drawn block whose letters cover most of its rows', () => {
  it('is sent whole, its start and end trusted, and nothing is skipped', () => {
    const canvas = lettered();
    const grid = gridGeometry({ width: 330, height: canvas.height, scale: 1, rgba: canvas.base64() });

    expect(grid?.skipped).toEqual([]);
    expect(grid?.blocks.map(({ column, top, bottom, fades }) => [column, top, bottom, fades])).toEqual([
      [4, Math.round(rowOf(13)), Math.round(rowOf(15 + 50 / 60)), false],
    ]);
  });
});
