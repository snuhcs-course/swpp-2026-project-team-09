/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readTimetable } from '@/features/timetable-ocr/read-timetable';

import { campusPlaces, type TruthTime } from './support/timetable-ocr';
import { gridOnly, NEW_SCREENSHOTS, type NewScreenshot, newTruth } from './support/timetable-ocr-new';

// P15-52 stage 1: the phone pipeline's pixel half (background, grid, hour axis, blocks) on the five new screenshots,
// with no ML Kit output: only the day letters and hour labels are stood in, so every block found is reported as
// `no-name` with the times it was read at. What it finds is compared with the ground truth's times. `OCR_ACCURACY=1`
// prints the numbers for accuracy.md.

const PLACES = campusPlaces();

function minutes(clock: string | null): number {
  const [hours, mins] = (clock ?? '-1:0').split(':').map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
}

interface PixelScore {
  truth: number;
  // Blocks found where a true time is, on its day.
  found: number;
  // Of those, read with start and end within 5 minutes.
  timesRight: number;
  // Blocks found where no true time is: furniture taken for a class.
  extra: number;
  wrong: string[];
}

function pixelScore(name: NewScreenshot): PixelScore {
  const reading = readTimetable(gridOnly(name), PLACES);
  const truth = newTruth(name).times;
  if (reading.kind !== 'read') {
    return { truth: truth.length, found: 0, timesRight: 0, extra: 0, wrong: [`no timetable: ${reading.reason}`] };
  }
  const blocks = reading.leftOut;
  const open = new Set<TruthTime>(truth);
  let found = 0;
  let timesRight = 0;
  let extra = 0;
  const wrong: string[] = [];
  for (const block of blocks) {
    const [start, end] = [minutes(block.start), minutes(block.end)];
    const match = [...open].find(
      (time) =>
        time.weekday === block.weekday &&
        Math.min(end, minutes(time.end)) - Math.max(start, minutes(time.start)) >
          (minutes(time.end) - minutes(time.start)) / 3,
    );
    if (match === undefined) {
      extra += 1;
      wrong.push(`extra ${block.weekday} ${block.start}–${block.end} (${block.reason})`);
      continue;
    }
    open.delete(match);
    found += 1;
    const right =
      Math.abs(start - minutes(match.start)) <= 5 &&
      Math.abs(end - minutes(match.end)) <= 5 &&
      block.reason === 'no-name';
    timesRight += Number(right);
    if (!right) {
      wrong.push(
        `${match.name} ${match.weekday} ${match.start}–${match.end} read ${block.start}–${block.end} (${block.reason})`,
      );
    }
  }
  wrong.push(...[...open].map((time) => `missed ${time.name} ${time.weekday} ${time.start}–${time.end}`));
  return { truth: truth.length, found, timesRight, extra, wrong };
}

// What the pixel half reaches on each, as accuracy.md reports it: blocks found, times right, furniture taken.
const REACHED: Record<NewScreenshot, { found: number; timesRight: number; extra: number }> = {
  'everytime-2': { found: 13, timesRight: 13, extra: 0 },
  'everytime-dark-1': { found: 12, timesRight: 12, extra: 0 },
  'snutt-4': { found: 12, timesRight: 12, extra: 0 },
  'snutt-dark-1': { found: 14, timesRight: 14, extra: 0 },
  'snutt-grey-1': { found: 14, timesRight: 14, extra: 0 },
};

describe.each(NEW_SCREENSHOTS)('the new screenshot %s, pixel half only', (name) => {
  it('finds the blocks and their times as accuracy.md reports', () => {
    const result = pixelScore(name);
    if (process.env.OCR_ACCURACY === '1') {
      // oxlint-disable-next-line no-console
      console.log(`${name}: ${JSON.stringify(result)}`);
    }
    expect({ found: result.found, timesRight: result.timesRight, extra: result.extra }).toEqual(REACHED[name]);
  });
});
