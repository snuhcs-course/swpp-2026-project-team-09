/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Place } from '@/api/types';
import { blockText, joinName, linesIn, roomOf, type RoomText } from '@/features/timetable-ocr/block-text';
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

function roomLine(
  text: string,
  { unclipped = true, confidence = 0.9, oneElement = true }: Partial<RoomText> = {},
): RoomText {
  return { text, unclipped, confidence, oneElement };
}

// A one-letter name, a name with a room, an empty block and a block of a mark only, each read with `confidence`.
function confidenceBlocks(confidence: number | null): Parameters<typeof screenshot>[0] {
  return [
    { day: 0, start: 10, end: 11, colour: BLUE, text: ['밍'], confidence },
    { day: 1, start: 10, end: 11, colour: BLUE, text: ['자료구조', '302-311-1'], confidence },
    { day: 2, start: 10, end: 11, colour: BLUE, text: [] },
    { day: 3, start: 10, end: 11, colour: BLUE, text: ['<'], confidence },
  ];
}

// What the blocks of `confidenceBlocks` read: the room linked or not.
function expectedReading(linked: boolean): object {
  return {
    kind: 'read',
    classes: [
      { name: '밍', times: [{ weekday: 'monday', start: '10:00', end: '11:00', room: null, placeId: null }] },
      {
        name: '자료구조',
        times: [
          {
            weekday: 'tuesday',
            start: '10:00',
            end: '11:00',
            room: linked ? '311-1' : null,
            placeId: linked ? 'place-302' : null,
          },
        ],
      },
    ],
    leftOut: [
      { weekday: 'wednesday', reason: 'no-name' },
      { weekday: 'thursday', reason: 'no-name' },
    ],
  };
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
    expect(joinName(['공학수학', '2'])).toBe('공학수학 2');
    expect(joinName(['대학영어', '2: 말하기'])).toBe('대학영어 2: 말하기');
    expect(joinName(['|인공지능 이론', '|및 응용 세미나'])).toBe('인공지능 이론및 응용 세미나');
  });

  it('keeps a name cut with … as read, without the …, and cuts a name at 30 characters', () => {
    expect(joinName(['컴퓨팅 살펴…'])).toBe('컴퓨팅 살펴');
    expect(joinName(['컴퓨팅 살펴...'])).toBe('컴퓨팅 살펴');
    expect(Array.from(joinName(['가'.repeat(40)]))).toHaveLength(30);
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

  it('is linked from a whole room that no block side cut, read with at least 0.5 confidence (Android)', () => {
    expect(linkRoom(roomLine('302-311-1'), places)?.building).toBe('302');
    expect(linkRoom(roomLine('302-311-1', { confidence: 0.55 }), places)?.building).toBe('302');
    expect(linkRoom(roomLine('302-311-1', { confidence: 0.45 }), places)).toBeNull();
    expect(linkRoom(roomLine('302 - …'), places)).toBeNull();
    expect(linkRoom(roomLine('302-311-1', { unclipped: false }), places)).toBeNull();
    expect(linkRoom(null, places)).toBeNull();
  });

  it('is linked without confidence (iOS) only when read inside one whole OCR element', () => {
    expect(linkRoom(roomLine('302-311-1', { confidence: null }), places)?.room).toBe('311-1');
    expect(linkRoom(roomLine('302 -311-1', { confidence: null, oneElement: false }), places)).toBeNull();
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

  it('join a name cut short to its whole name, but keep a course and its 연습 section apart', () => {
    expect(
      mergeClasses([
        { name: '컴퓨터프로그래밍', time: time('monday', '19:00', '21:00') },
        { name: '컴퓨터프로그래', time: time('thursday', '14:00', '15:50'), cut: true },
      ]),
    ).toEqual([
      { name: '컴퓨터프로그래밍', times: [time('monday', '19:00', '21:00'), time('thursday', '14:00', '15:50')] },
    ]);
    // The same short name without a sign of being cut is a class of its own.
    expect(
      mergeClasses([
        { name: '컴퓨터프로그래밍', time: time('monday', '19:00', '21:00') },
        { name: '컴퓨터프로그래', time: time('thursday', '14:00', '15:50') },
      ]),
    ).toHaveLength(2);
    expect(
      mergeClasses([
        { name: '컴퓨터프로그래밍', time: time('tuesday', '09:30', '10:45') },
        { name: '컴퓨터프로그래밍연습', time: time('friday', '14:00', '15:50') },
      ]).map((lesson) => lesson.name),
    ).toEqual(['컴퓨터프로그래밍', '컴퓨터프로그래밍연습']);
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

  it('drops a chevron or icon read as a mark by its characters, whatever its confidence', () => {
    const chevron = {
      ...line('< 2학기', 75, 225),
      box: { x: 75, y: 225, w: 200, h: 40 },
      elements: [
        { text: '<', box: { x: 75, y: 225, w: 30, h: 40 }, confidence: 0.9 },
        { text: '2학기', box: { x: 120, y: 225, w: 150, h: 40 }, confidence: null },
      ],
    };
    expect(findTitle([chevron], 2868, 419)).toBe('2학기');
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

  it('keeps a block with a name whatever its confidence, on Android and iOS alike, and leaves out a block without one', () => {
    // Only the room's link asks for confidence: a room read at 0.05 is not linked; its class is kept all the same.
    for (const [confidence, linked] of [
      [0.05, false],
      [0.9, true],
      [null, true],
    ] as const) {
      expect(readTimetable(screenshot(confidenceBlocks(confidence)), [place('302')])).toMatchObject(
        expectedReading(linked),
      );
    }
  });
});

describe('a room cut or alone', () => {
  it('takes a room only below the first line', () => {
    const lines = linesIn([word('43-1', 25, 45, 40, 1), word('영상예술의', 25, 70, 30, 2)], {
      x0: 22,
      x1: 82,
      y0: 20,
      y1: 80,
    });
    expect(blockText(lines)).toMatchObject({ name: '영상예술의', room: { text: '43-1' } });
    // A first line that reads like a room is the name when a line follows ("2" in "공학수학" / "2" is no room).
    const first = linesIn([word('2', 25, 30, 30, 1), word('공학수학', 25, 60, 45, 2)], {
      x0: 22,
      x1: 82,
      y0: 20,
      y1: 80,
    });
    expect(blockText(first)).toMatchObject({ name: '2 공학수학', room: null });
    // A block of nothing but a room has no name.
    expect(blockText(linesIn([word('302', 25, 45, 30)], { x0: 22, x1: 82, y0: 20, y1: 80 }))).toMatchObject({
      name: '',
    });
  });

  it('is not linked when a word was cut at the block’s side', () => {
    // `43-1-304` running over the block's left edge reads `3-1-304` inside it, which still looks like a room.
    const lines = linesIn([word('수학연습', 20, 50, 30, 1), word('43-1-304', 10, 60, 45, 2)], {
      x0: 15,
      x1: 80,
      y0: 20,
      y1: 80,
    });
    const text = blockText(lines);
    expect(text.room).toMatchObject({ text: '3-1-304', unclipped: false });
    expect(
      linkRoom(
        text.room,
        ['3', '43-1'].map((number) => place(number)),
      ),
    ).toBeNull();
  });

  it('makes no class of a block that holds only a room: it is left out without a name', () => {
    const reading = readTimetable(screenshot([{ day: 0, start: 10, end: 11, colour: BLUE, text: ['302-311-1'] }]), [
      place('302'),
    ]);
    expect(reading).toMatchObject({ kind: 'read', classes: [], leftOut: [{ weekday: 'monday', reason: 'no-name' }] });
  });
});
