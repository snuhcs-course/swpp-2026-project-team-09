/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readTimetable } from '@/features/timetable-ocr/read-timetable';

import { campusPlaces } from './support/timetable-ocr';
import {
  BLUE,
  CYAN,
  DARK,
  type DrawnBlock,
  GREEN,
  gridCanvas,
  headerLines,
  INDIGO,
  labelLines,
  LIME,
  ORANGE,
  PURPLE,
  rowOf,
  screenshot,
  summary,
} from './support/timetable-ocr-synthetic';

// The pixel steps on pictures that are not a white SNUTT or 에브리타임 screenshot: dark mode, pale colours, blocks back
// to back or stacked, a scrolled timetable, a shaded header. The background, the grid and the blocks are measured from
// each picture. See .scratch/iteration-2/fix-timetable-ocr/plan.md for the inventory of failure modes.

const PLACES = campusPlaces();

// The user's dark-mode timetable as their screenshot shows it: 9–20 labels, 월–금, coloured blocks with white text,
// the last block running off the picture's bottom with a gradient.
const DARK_BLOCKS: DrawnBlock[] = [
  ...[0, 2].flatMap((day): DrawnBlock[] => [
    { day, start: 9.5, end: 10.75, colour: GREEN, text: ['고급컴퓨터구', '조', '301-203'] },
    { day, start: 11, end: 12.25, colour: PURPLE, text: ['정치와 정치', '이념', '83-201'] },
    { day, start: 12.5, end: 13.75, colour: ORANGE, text: ['영상예술의', '이해', '83-404'] },
    { day, start: 15.5, end: 16.75, colour: LIME, text: ['소프트웨어', '개발의 원리', '와 실습', '302-311-1'] },
  ]),
  ...[1, 3].map((day): DrawnBlock => ({ day, start: 11, end: 12.25, colour: INDIGO, text: ['운영체제', '301-203'] })),
  {
    day: 1,
    start: 12.5,
    end: 15.25,
    colour: BLUE,
    text: ['베리타스 강좌', '1: 의미', '61-320/61-', '102/61-103/', '61-104/61-', '105/61-106/', '61-107'],
  },
  { day: 4, start: 13, end: 13 + 50 / 60, colour: CYAN, text: ['스튜디오…', '220-413'] },
  {
    day: 4,
    start: 14,
    end: 15 + 50 / 60,
    colour: CYAN,
    text: ['스튜디오 뮤', '직 메이킹', '(로직, 사운', '드 디자인)', '입문', '220-413'],
  },
  {
    day: 2,
    start: 19,
    end: 21,
    colour: LIME,
    text: ['소프트웨어', '개발의 원리', '와 실습'],
    fadeTo: DARK.background,
  },
];

describe('a dark-mode screenshot (the user’s, 1179 px wide)', () => {
  const output = screenshot(
    DARK_BLOCKS,
    headerLines().concat(labelLines(9, 20)),
    gridCanvas(5, DARK, rowOf(20.4), 20),
    {
      scale: 1179 / 330,
      theme: DARK,
    },
  );

  it('reads every block but the one cut at the bottom, with its times, name and room', () => {
    const reading = readTimetable(output, PLACES);
    expect(summary(reading).toSorted()).toEqual(
      [
        '고급컴퓨터구조 monday 09:30-10:45 301 203',
        '고급컴퓨터구조 wednesday 09:30-10:45 301 203',
        '정치와정치이념 monday 11:00-12:15 83 201',
        '정치와정치이념 wednesday 11:00-12:15 83 201',
        '영상예술의이해 monday 12:30-13:45 83 404',
        '영상예술의이해 wednesday 12:30-13:45 83 404',
        '소프트웨어개발의원리와실습 monday 15:30-16:45 302 311-1',
        '소프트웨어개발의원리와실습 wednesday 15:30-16:45 302 311-1',
        '운영체제 tuesday 11:00-12:15 301 203',
        '운영체제 thursday 11:00-12:15 301 203',
        '베리타스강좌1:의미 tuesday 12:30-15:15 61 320',
        '스튜디오뮤직메이킹(로직,사운드디자인)입문 friday 13:00-13:50 220 413',
        '스튜디오뮤직메이킹(로직,사운드디자인)입문 friday 14:00-15:50 220 413',
      ].toSorted(),
    );
    expect(reading).toMatchObject({ leftOut: [{ weekday: 'wednesday', start: '19:00', reason: 'end-uncertain' }] });
  });
});

describe('the blocks, measured against the picture’s own background', () => {
  it('finds pale (pastel) blocks, which differ from white by little colour', () => {
    const reading = readTimetable(
      screenshot([
        { day: 0, start: 10, end: 11.5, colour: [255, 226, 222], text: ['자료구조', '302-311-1'] },
        { day: 1, start: 10, end: 11.5, colour: [222, 238, 255], text: ['운영체제'] },
      ]),
      PLACES,
    );
    expect(summary(reading)).toEqual(['자료구조 monday 10:00-11:30 302 311-1', '운영체제 tuesday 10:00-11:30 - -']);
  });

  it('keeps both of two blocks back to back in one column: the edge they share is certain', () => {
    const reading = readTimetable(
      screenshot([
        { day: 2, start: 10, end: 11, colour: BLUE, text: ['자료구조'] },
        { day: 2, start: 11, end: 12, colour: ORANGE, text: ['운영체제'] },
      ]),
      PLACES,
    );
    expect(summary(reading)).toEqual(['자료구조 wednesday 10:00-11:00 - -', '운영체제 wednesday 11:00-12:00 - -']);
  });
});

describe('a block’s edges', () => {
  it('splits two same-coloured blocks stacked in dark mode at a separator darker than them', () => {
    const reading = readTimetable(
      screenshot(
        [
          { day: 0, start: 10, end: 11.5, colour: GREEN, text: ['자료구조'] },
          { day: 0, start: 11.5, end: 13, colour: GREEN, text: ['운영체제'] },
          // The separator: one row of the background across the column, which the mask's closing bridges.
          { day: 0, start: 11.5, end: 11.5 + 1 / 40, colour: DARK.background, text: [] },
        ],
        headerLines().concat(labelLines()),
        gridCanvas(5, DARK),
        { theme: DARK },
      ),
      [],
    );
    expect(summary(reading)).toEqual(['자료구조 monday 10:00-11:30 - -', '운영체제 monday 11:30-13:00 - -']);
  });

  it('leaves out a block cut by the picture’s top in a timetable scrolled down, rather than start it late', () => {
    const reading = readTimetable(
      screenshot(
        [
          { day: 0, start: 5.5, end: 11, colour: BLUE, text: ['', '', '', '자료구조'] },
          { day: 1, start: 10, end: 11, colour: ORANGE, text: ['운영체제'] },
        ],
        labelLines(7, 20),
      ),
      [],
    );
    expect(summary(reading)).toEqual(['운영체제 tuesday 10:00-11:00 - -']);
    expect(reading).toMatchObject({ leftOut: [{ weekday: 'monday', reason: 'start-uncertain' }] });
  });
});
describe('a block’s start under a shaded header', () => {
  it('is certain for a block at the first hour right under the header band, which reads like the grid', () => {
    const canvas = gridCanvas();
    // A tinted header band from above the day letters down to 9:00, the first hour.
    canvas.fill(0, 85, 330, rowOf(9), [205, 220, 245]);
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
    expect(summary(reading)).toEqual(['자료구조 monday 09:00-10:30 - -', '운영체제 tuesday 10:00-11:00 - -']);
  });
});
