/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readTimetable } from '@/features/timetable-ocr/read-timetable';

import {
  BLUE,
  type Canvas,
  type Colour,
  DARK,
  type DrawnBlock,
  gridCanvas,
  HEIGHT,
  headerLines,
  labelLines,
  LIME,
  line,
  ORANGE,
  rowOf,
  screenshot,
  summary,
  WIDTH,
} from './support/timetable-ocr-synthetic';

// A block's edges against what lies around it, from the review of PR #113: a sticky header over a scrolled
// timetable, a tinted header band, a week so full that a block colour covers more of the picture than the background,
// an opaque tab bar with icons in dark mode, and two classes side by side at half width.

const BAND: Colour = [205, 220, 245];

function reasons(reading: ReturnType<typeof readTimetable>): string[] {
  return reading.kind === 'read' ? reading.leftOut.map((out) => `${out.weekday} ${out.reason}`) : [reading.reason];
}

// A sticky day header: its band painted over whatever scrolled under it, from above the letters down to row 120.
function stickyHeader(canvas: Canvas): void {
  canvas.fill(0, 85, WIDTH, rowOf(9), BAND);
}

// An opaque grey tab bar from 20:00 down, with white icons: a 1-pixel stroke every 4 pixels in its top 20 rows.
function tabBar(canvas: Canvas): void {
  canvas.fill(0, rowOf(20), WIDTH, HEIGHT, [60, 60, 64]);
  for (let x = 0; x < WIDTH; x += 4) {
    canvas.fill(x, rowOf(20), x + 1, rowOf(20) + 20, [255, 255, 255]);
  }
}

// Two classes in one column, each drawn at half its width: touching, or 10 pixels apart.
function halves(canvas: Canvas): void {
  canvas.fill(31, rowOf(10), 59, rowOf(11.5), BLUE);
  canvas.fill(61, rowOf(10), 89, rowOf(11.5), ORANGE);
}

function apartHalves(canvas: Canvas): void {
  canvas.fill(31, rowOf(10), 55, rowOf(11.5), BLUE);
  canvas.fill(65, rowOf(10), 89, rowOf(11.5), BLUE);
}

describe('a block under the day header', () => {
  it('cut by a sticky header in a scrolled timetable has an uncertain start: the band trusts only the first hour', () => {
    // The timetable is scrolled so that the first label shown is 10; 월's class started at 8:30, under the header.
    const reading = readTimetable(
      screenshot(
        [
          { day: 0, start: 8.5, end: 11, colour: BLUE, text: ['', '', '자료구조'] },
          { day: 1, start: 10, end: 11, colour: ORANGE, text: ['운영체제'] },
        ],
        headerLines().concat(labelLines(10, 20)),
        undefined,
        { overlay: stickyHeader },
      ),
      [],
    );
    expect(summary(reading)).toEqual(['운영체제 tuesday 10:00-11:00 - -']);
    expect(reasons(reading)).toEqual(['monday start-uncertain']);
  });

  it('of nearly the band’s own colour is reported as left out, not swallowed by the band', () => {
    const canvas = gridCanvas();
    // A header band tinted almost as the block below it, which no colour change separates from it.
    canvas.fill(0, 85, WIDTH, rowOf(9), [30, 140, 250]);
    const reading = readTimetable(
      screenshot(
        [
          { day: 0, start: 9, end: 10.5, colour: BLUE, text: ['자료구조'] },
          { day: 1, start: 10, end: 11, colour: ORANGE, text: ['운영체제'] },
        ],
        headerLines().concat(labelLines()),
        canvas,
      ),
      [],
    );
    expect(summary(reading)).toEqual(['운영체제 tuesday 10:00-11:00 - -']);
    expect(reasons(reading)).toEqual(['monday start-uncertain']);
  });
});

describe('the background', () => {
  it('is the most common grey, even when one block colour covers more of the picture', () => {
    // Five days of eight classes, all one colour, 6 pixels apart.
    const blocks: DrawnBlock[] = [0, 1, 2, 3, 4].flatMap((day) =>
      [0, 1, 2, 3, 4, 5, 6, 7].map((index) => ({
        day,
        start: 9 + index * 1.55,
        end: 9 + index * 1.55 + 1.4,
        colour: BLUE,
        text: [`수업 ${day * 8 + index}`],
      })),
    );
    const reading = readTimetable(screenshot(blocks), []);
    expect(summary(reading)).toHaveLength(40);
    expect(reasons(reading)).toEqual([]);
  });
});

describe('a block’s end over a tab bar in dark mode', () => {
  it('is uncertain when the rows below are an opaque bar with icons, though their mean is a plain grey', () => {
    const reading = readTimetable(
      screenshot(
        [
          { day: 2, start: 18, end: 21, colour: LIME, text: ['소프트웨어', '개발'] },
          { day: 1, start: 10, end: 11, colour: ORANGE, text: ['운영체제'] },
        ],
        headerLines().concat(labelLines()),
        gridCanvas(5, DARK),
        { theme: DARK, overlay: tabBar },
      ),
      [],
    );
    expect(summary(reading)).toEqual(['운영체제 tuesday 10:00-11:00 - -']);
    expect(reasons(reading)).toEqual(['wednesday end-uncertain']);
  });
});

describe('two classes side by side at half width', () => {
  it.each([
    ['touching, in two colours', halves],
    ['apart, in one colour', apartHalves],
  ])('%s, are reported as left out, with their names, rather than dropped unseen', (_, overlay) => {
    const reading = readTimetable(
      screenshot(
        [{ day: 1, start: 10, end: 11, colour: ORANGE, text: ['운영체제'] }],
        headerLines().concat(
          labelLines(),
          line('자료구조', 33, rowOf(10) + 3, 0.9, 24),
          line('물리학', 63, rowOf(10) + 3, 0.9, 24),
        ),
        undefined,
        { overlay },
      ),
      [],
    );
    expect(summary(reading)).toEqual(['운영체제 tuesday 10:00-11:00 - -']);
    expect(reading.kind === 'read' ? reading.leftOut : []).toMatchObject([
      { weekday: 'monday', name: '자료구조', start: '10:00', end: '11:30', reason: 'too-narrow' },
      { weekday: 'monday', name: '물리학', start: '10:00', end: '11:30', reason: 'too-narrow' },
    ]);
  });
});
