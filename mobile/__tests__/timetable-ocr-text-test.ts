/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Place } from '@/api/types';
import { blockText, joinName, linesIn, roomOf } from '@/features/timetable-ocr/block-text';
import { buildingOf, linkRoom } from '@/features/timetable-ocr/building';
import { mergeClasses, type ReadTime } from '@/features/timetable-ocr/classes';
import { readTimetable } from '@/features/timetable-ocr/read-timetable';
import { findTitle } from '@/features/timetable-ocr/title';
import { clipWord, type Word } from '@/features/timetable-ocr/words';

import { headerLines, labelLines, line, screenshot } from './support/timetable-ocr-synthetic';

// The text steps of the timetable reading pipeline: a block's name and room, the building, the classes, the title,
// and the whole pipeline on a drawn timetable.

const BLUE: [number, number, number] = [73, 150, 225];

function word(text: string, x0: number, x1: number, y = 50, lineIndex = 0): Word {
  return { text, x0, x1, y0: y - 5, y1: y + 5, confidence: 0.9, line: lineIndex };
}

function place(number: string): Place {
  return { id: `place-${number}`, number, name: number, latitude: 37.45, longitude: 126.95 };
}

function roomLine(text: string, confidence: number | null, elements = 1): Parameters<typeof linkRoom>[0] {
  return { text, y: 0, confidence, elements, wholeElement: elements === 1 };
}

function time(weekday: ReadTime['weekday'], start: string, end: string): ReadTime {
  return { weekday, start, end, room: null, placeId: null };
}

describe('a block’s text', () => {
  it('keeps of a word only what lies inside the block: an hour label glued to a name falls out', () => {
    // "2자료구조" read from x 15 to 54, the block starting at 22.
    expect(clipWord(word('2자료구조', 14.75, 53.75), 22, 82)).toBe('자료구조');
    expect(clipWord(word('기컴퓨터프로그래', 16, 76.75), 22, 82)).toBe('컴퓨터프로그래');
    expect(clipWord(word('자료구조', 145, 175), 143, 203)).toBe('자료구조');
  });

  it('reads a room by the pattern, spaces around hyphens removed', () => {
    for (const room of ['302-311-1', '43-2-B101', '500-L308', '43-1', '26-404', '8-408']) {
      expect(roomOf(room)).toBe(room);
    }
    expect(roomOf('302 - 311-1')).toBe('302-311-1');
    for (const text of ['302 - …', '공학수학 2', '302-311-1a', '1234-5', '43-1-304-1-2', '5 a 62/130']) {
      expect(roomOf(text)).toBeNull();
    }
  });

  it('joins the other lines into the name: Korean without a space, Latin letters or digits with one', () => {
    expect(joinName(['하드웨어시스', '템설계'])).toBe('하드웨어시스템설계');
    expect(joinName(['창의적통합설', '계2'])).toBe('창의적통합설계2');
    expect(joinName(['Data', 'Science'])).toBe('Data Science');
    expect(joinName(['|인공지능 이론', '|및 응용 세미나'])).toBe('인공지능 이론및 응용 세미나');
  });

  it('keeps a name cut with … as read, without the …, and cuts a name at 30 characters', () => {
    expect(joinName(['컴퓨팅 살펴…'])).toBe('컴퓨팅 살펴');
    expect(joinName(['컴퓨팅 살펴...'])).toBe('컴퓨팅 살펴');
    expect(Array.from(joinName(['가'.repeat(40)]))).toHaveLength(30);
  });

  it('takes a room only below the first line', () => {
    const lines = linesIn([word('43-1', 25, 45, 40, 1), word('영상예술의', 25, 70, 30, 2)], {
      x0: 22,
      x1: 82,
      y0: 20,
      y1: 80,
    });
    expect(blockText(lines)).toMatchObject({ name: '영상예술의', room: { text: '43-1' } });
    expect(blockText(linesIn([word('302', 25, 45, 30)], { x0: 22, x1: 82, y0: 20, y1: 80 })).room).toBeNull();
  });
});

describe('the building of a room', () => {
  const places = ['43', '43-1', '43-2', '301', '302', '500', '25-1', '25'].map((number) => place(number));

  it('is the longest leading run of parts that is a Place’s number', () => {
    expect(buildingOf('43-1-304', places)).toEqual({ placeId: 'place-43-1', building: '43-1', room: '304' });
    expect(buildingOf('302-311-1', places)).toEqual({ placeId: 'place-302', building: '302', room: '311-1' });
    expect(buildingOf('43-2-B101', places)).toEqual({ placeId: 'place-43-2', building: '43-2', room: 'B101' });
    expect(buildingOf('25-105', places)).toEqual({ placeId: 'place-25', building: '25', room: '105' });
    expect(buildingOf('43-1', places)).toEqual({ placeId: 'place-43-1', building: '43-1', room: null });
    expect(buildingOf('999-101', places)).toBeNull();
  });

  it('is linked only from a whole room line read with enough confidence', () => {
    expect(linkRoom(roomLine('302-311-1', 0.88), places)?.building).toBe('302');
    expect(linkRoom(roomLine('302-311-1', 0.6), places)).toBeNull();
    expect(linkRoom(roomLine('302 - …', 0.95), places)).toBeNull();
    expect(linkRoom(null, places)).toBeNull();
  });

  it('without confidence (iOS) is linked only from a room read as one whole element', () => {
    expect(linkRoom({ text: '302-311-1', y: 0, confidence: null, elements: 1, wholeElement: true }, places)?.room).toBe(
      '311-1',
    );
    expect(
      linkRoom({ text: '302 -311-1', y: 0, confidence: null, elements: 2, wholeElement: false }, places),
    ).toBeNull();
  });
});

describe('the classes', () => {
  it('merge blocks of one name, spaces aside, into one class with its times in the week’s order', () => {
    expect(
      mergeClasses([
        { name: '공학수학 2', time: time('thursday', '09:30', '10:45') },
        { name: '공학수학2', time: time('tuesday', '09:30', '10:45') },
        { name: '물리학실험 1', time: time('tuesday', '16:00', '17:50') },
        { name: '물리학 1', time: time('tuesday', '14:00', '15:15') },
      ]),
    ).toEqual([
      { name: '공학수학2', times: [time('tuesday', '09:30', '10:45'), time('thursday', '09:30', '10:45')] },
      { name: '물리학 1', times: [time('tuesday', '14:00', '15:15')] },
      { name: '물리학실험 1', times: [time('tuesday', '16:00', '17:50')] },
    ]);
  });

  it('keep times that cross on one day apart, as two classes of the same name', () => {
    const classes = mergeClasses([
      { name: '근장', time: time('wednesday', '09:00', '12:00') },
      { name: '근장', time: time('wednesday', '11:00', '13:00') },
      { name: '근장', time: time('thursday', '09:00', '12:00') },
    ]);
    expect(classes.map((lesson) => lesson.times.length)).toEqual([2, 1]);
  });

  it('join a name read short to its whole name', () => {
    const classes = mergeClasses([
      { name: '컴퓨터프로그래밍', time: time('monday', '19:00', '21:00') },
      { name: '컴퓨터프로그래', time: time('thursday', '14:00', '15:50') },
    ]);
    expect(classes).toEqual([
      { name: '컴퓨터프로그래밍', times: [time('monday', '19:00', '21:00'), time('thursday', '14:00', '15:50')] },
    ]);
  });
});

describe('the title', () => {
  const lines = [
    line('1:04', 160, 78, 0.8),
    { ...line('2025년 여름학기', 75, 225, 0.89), box: { x: 75, y: 225, w: 266, h: 34 } },
    { ...line('시간표 <', 74, 275, 0.65), box: { x: 74, y: 275, w: 248, h: 58 } },
    { ...line('17학점', 611, 260, 0.75), box: { x: 611, y: 260, w: 94, h: 45 } },
    { ...line('+', 1153, 223, 0.46), box: { x: 1153, y: 223, w: 56, h: 58 } },
  ];

  it('is the tallest line between the status bar and the header, leaving out credits, icons and 시간표', () => {
    expect(findTitle(lines, 2868, 419)).toBe('2025년 여름학기');
  });

  it('is cut to 20 characters, and missing when nothing qualifies', () => {
    expect(findTitle([line('가'.repeat(25), 100, 220)], 2868, 419)).toBe('가'.repeat(20));
    expect(
      findTitle(
        lines.filter((one) => one.text !== '2025년 여름학기'),
        2868,
        419,
      ),
    ).toBeNull();
  });
});

describe('the whole pipeline on a drawn timetable', () => {
  it('reads 12-hour labels like 24-hour ones and gives the spec’s shape', () => {
    const blocks = [{ day: 1, start: 13, end: 14.25, colour: BLUE, text: ['자료구조', '302-311-1'] }];
    const read = (twelve: boolean): unknown =>
      readTimetable(screenshot(blocks, headerLines().concat(labelLines(9, 20, twelve))), [place('302')]);
    expect(read(true)).toEqual(read(false));
    expect(read(false)).toEqual({
      kind: 'read',
      title: null,
      classes: [
        {
          name: '자료구조',
          times: [{ weekday: 'tuesday', start: '13:00', end: '14:15', room: '311-1', placeId: 'place-302' }],
        },
      ],
      leftOut: [],
    });
  });

  it('leaves out a block read with too little confidence, and without confidence a one-letter name', () => {
    const reading = readTimetable(
      screenshot([
        { day: 0, start: 10, end: 11, colour: BLUE, text: ['밍'], confidence: 0.2 },
        { day: 1, start: 10, end: 11, colour: BLUE, text: ['국'], confidence: null },
        { day: 2, start: 10, end: 11, colour: BLUE, text: [] },
      ]),
      [],
    );
    expect(reading.kind === 'read' ? reading.leftOut.map((out) => out.reason) : []).toEqual([
      'low-confidence',
      'too-little-text',
      'no-name',
    ]);
  });
});
