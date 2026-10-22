/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { classSaves } from '@/features/timetable-ocr/classes';
import { columnsFromGridLines, findHeader } from '@/features/timetable-ocr/grid';
import type { NativeOcrResult } from '@/features/timetable-ocr/native-ocr';
import { decodePixels } from '@/features/timetable-ocr/pixels';
import { readTimetable } from '@/features/timetable-ocr/read-timetable';
import { wordsOf } from '@/features/timetable-ocr/words';
import { checkedClasses } from '@/features/timetable/version-checks';

import {
  campusPlaces,
  ocrOutput,
  PENDING_SCREENSHOTS,
  SCREENSHOTS,
  type Score,
  score,
  type Screenshot,
  truth,
  withoutConfidence,
} from './support/timetable-ocr';

// The whole pipeline on the four reference screenshots' saved ML Kit outputs, compared with the hand-written ground
// truth. The numbers asserted are the ones reached and reported in accuracy.md: a change that lowers them fails here.
// `OCR_ACCURACY=1` prints what was read and the score.

const PLACES = campusPlaces();

// The same output with the day header's letters taken out, so that the columns come from the grid lines.
function withoutHeader(result: NativeOcrResult): NativeOcrResult {
  return { ...result, lines: result.lines.filter((line) => !/^[월화수목금토일]$/u.test(line.text.trim())) };
}

function run(name: Screenshot, output: NativeOcrResult, label: string): Score {
  const reading = readTimetable(output, PLACES);
  if (reading.kind !== 'read') {
    throw new Error(`${name}: no timetable (${reading.reason})`);
  }
  // P13-03's check before a version reaches the server takes every class as read.
  expect(checkedClasses(classSaves(reading.classes)).dropped).toEqual({ classes: 0, times: 0 });
  expect(reading.title).toBe(truth(name).title);
  const result = score(reading.classes, reading.leftOut, truth(name));
  if (process.env.OCR_ACCURACY === '1') {
    const classes = reading.classes.map(
      (lesson) =>
        `${lesson.name}: ${lesson.times.map((time) => `${time.weekday.slice(0, 3)} ${time.start}-${time.end} ${time.placeId ?? '-'} ${time.room ?? '-'}`).join(', ')}`,
    );
    const missed = result.missed.map((one) => `${one.time.name} ${one.time.weekday} ${one.time.start}: ${one.why}`);
    // oxlint-disable-next-line no-console
    console.log(
      [`${name} ${label}, title ${reading.title}`, ...classes, JSON.stringify({ ...result, missed })].join('\n'),
    );
  }
  return result;
}

// What each screenshot reaches: the times read and matched to a true one, of those read.
const REACHED: Record<Screenshot, number> = { 'everytime-1': 14, 'snutt-1': 16, 'snutt-2': 12, 'snutt-3': 6 };

describe.each(SCREENSHOTS)('the screenshot %s', (name) => {
  it('is read as its ground truth says, with no building linked wrongly', () => {
    const result = run(name, ocrOutput(name), 'android');
    expect(result.matched).toBeGreaterThanOrEqual(REACHED[name]);
    // Everything read is real: nothing is read that the screenshot does not hold.
    expect(result.readTimes).toBe(result.matched);
    expect(result.dayRight).toBe(result.matched);
    expect(result.startWithin5).toBe(result.matched);
    expect(result.endWithin5).toBe(result.matched);
    expect(result.buildingsWrong).toBe(0);
    expect(result.nameEdits / result.nameCharacters).toBeLessThanOrEqual(0.03);
  });

  it('is read the same without confidence (iOS): confidence decides nothing', () => {
    const android = readTimetable(ocrOutput(name), PLACES);
    const ios = readTimetable(withoutConfidence(ocrOutput(name)), PLACES);
    expect(ios).toEqual(android);
  });
});

describe.each(SCREENSHOTS)('the screenshot %s, without its header or timed', (name) => {
  it('gives the same columns from the grid lines as from the header, and reads the same without the header', () => {
    const output = ocrOutput(name);
    const image = decodePixels(output.pixels);
    const header = findHeader(wordsOf(output), image.width);
    const lines = columnsFromGridLines(image, image.height * 0.1, image.height * 0.9);
    expect(lines?.map((column) => column.weekday)).toEqual(header?.columns.map((column) => column.weekday));
    lines?.forEach((column, index) => {
      expect(Math.abs(column.left - (header?.columns[index]?.left ?? 0))).toBeLessThanOrEqual(1.5);
    });
    const withHeader = run(name, output, 'android');
    const fallback = run(name, withoutHeader(output), 'android, no header');
    expect(fallback.matched).toBe(withHeader.matched);
    expect(fallback.readTimes).toBe(withHeader.readTimes);
  });

  it('is read in well under 2 seconds in Node (the emulator is the target; Node is the proxy)', () => {
    const output = ocrOutput(name);
    readTimetable(output, PLACES);
    const times: number[] = [];
    for (let round = 0; round < 5; round += 1) {
      const started = performance.now();
      readTimetable(output, PLACES);
      times.push(performance.now() - started);
    }
    const median = times.toSorted((one, other) => one - other)[2] ?? 0;
    if (process.env.OCR_ACCURACY === '1') {
      // oxlint-disable-next-line no-console
      console.log(`${name}: ${median.toFixed(1)} ms (median of 5)`);
    }
    expect(median).toBeLessThan(500);
  });
});

// A screenshot whose fixture is still to come (the user's dark-mode one) is held to the same hard bars once it is
// saved: nothing read that is not there, and no building linked wrongly, with confidence and without.
describe.each(Object.entries(PENDING_SCREENSHOTS))('the screenshot %s', (name, saved) => {
  if (saved === null) {
    it.todo(`is read once its ML Kit output and ground truth are saved in fixtures/timetable-ocr/${name}.*`);
    return;
  }
  it('is read with nothing that is not there and no building linked wrongly', () => {
    for (const output of [saved.output, withoutConfidence(saved.output)]) {
      const reading = readTimetable(output, PLACES);
      expect(reading.kind).toBe('read');
      const result =
        reading.kind === 'read' ? score(reading.classes, reading.leftOut, saved.truth) : score([], [], saved.truth);
      expect(result.readTimes).toBe(result.matched);
      expect(result.buildingsWrong).toBe(0);
    }
  });
});

function readOf(name: Screenshot): Score {
  const reading = readTimetable(ocrOutput(name), PLACES);
  return reading.kind === 'read' ? score(reading.classes, reading.leftOut, truth(name)) : score([], [], truth(name));
}

it('reads 48 of the 50 true times over the four screenshots, with nothing read that is not there', () => {
  const scores = SCREENSHOTS.map((name) => readOf(name));
  const total = (key: 'matched' | 'readTimes' | 'truthTimes'): number => scores.reduce((sum, one) => sum + one[key], 0);
  expect(total('truthTimes')).toBe(50);
  expect(total('matched')).toBe(48);
  expect(total('readTimes')).toBe(48);
});
