/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Place } from '@/api/types';
import { blockText, linesIn } from '@/features/timetable-ocr/block-text';
import { linkRoom } from '@/features/timetable-ocr/building';
import { mergeClasses, type ReadTime } from '@/features/timetable-ocr/classes';
import { findHeader } from '@/features/timetable-ocr/grid';
import { fitHourLabels } from '@/features/timetable-ocr/hours';
import { readTimetable } from '@/features/timetable-ocr/read-timetable';
import { type Word, wordsOf } from '@/features/timetable-ocr/words';

import { campusPlaces } from './support/timetable-ocr';
import {
  BLUE,
  COLUMN,
  type DrawnBlock,
  GREEN,
  HEIGHT,
  headerLines,
  labelLines,
  LEFT,
  line,
  ORANGE,
  rowOf,
  screenshot,
  summary,
} from './support/timetable-ocr-synthetic';

// The text steps on what a typical timetable could hold beyond the four reference screenshots: rooms listing several
// rooms, names cut with `…`, other hour labels and day names. See .scratch/iteration-2/fix-timetable-ocr/plan.md.

const PLACES = campusPlaces();
const FEW_PLACES: Place[] = ['43-1', '61', '302'].map((number) => ({
  id: `place-${number}`,
  number,
  name: number,
  latitude: 0,
  longitude: 0,
}));
const BOX = { x0: 22, x1: 82, y0: 20, y1: 120 };

function word(text: string, y: number, index: number): Word {
  return { text, x0: 25, x1: 25 + text.length * 4, y0: y - 5, y1: y + 5, confidence: 0.9, line: index };
}

function time(weekday: ReadTime['weekday'], start: string, end: string): ReadTime {
  return { weekday, start, end, room: null, placeId: null };
}

function twelve(hour: number): number {
  return hour > 12 ? hour - 12 : hour;
}

// Hour labels from 9 to 20 every `step` hours, as `shown` writes them, under the day header.
function labels(shown: (hour: number) => string, step = 1): Parameters<typeof screenshot>[1] {
  const lines = [];
  for (let hour = 9; hour <= 20; hour += step) {
    lines.push(line(shown(hour), 2, rowOf(hour) + 4, 0.9, 26));
  }
  return headerLines().concat(lines);
}

function halfHour(hour: number): string {
  return `${Math.floor(hour)}:${hour % 1 === 0 ? '00' : '30'}`;
}

const LABEL_FORMS: [string, (hour: number) => string][] = [
  ['오전 9시 … 오후 8시', (hour: number): string => `${hour < 12 ? '오전' : '오후'} ${twelve(hour)}시`],
  ['9 AM … 8 PM', (hour: number): string => `${twelve(hour)} ${hour < 12 ? 'AM' : 'PM'}`],
  ['09:00 … 20:00', (hour: number): string => `${String(hour).padStart(2, '0')}:00`],
];

describe('a room part', () => {
  it('listing several rooms over wrapped lines is the room, not the name: its first room is linked', () => {
    const text = blockText(
      linesIn(
        ['베리타스 강좌', '1: 의미', '61-320/61-', '102/61-103/', '61-107'].map((one, index) =>
          word(one, 30 + index * 12, index),
        ),
        BOX,
      ),
    );
    expect(text).toMatchObject({ name: '베리타스 강좌 1: 의미', room: { text: '61-320', oneElement: true } });
  });

  it('cut with `…` is no part of the name and links nothing', () => {
    const text = blockText(linesIn([word('공학수학', 30, 0), word('302 - …', 42, 1)], BOX));
    expect(text.name).toBe('공학수학');
    expect(linkRoom(text.room, FEW_PLACES)).toBeNull();
  });

  it('broken at a wrap inside a room matches no room rather than another one', () => {
    const text = blockText(linesIn([word('공학수학', 30, 0), word('43-1', 42, 1), word('304', 54, 2)], BOX));
    expect(text.room?.text).toBe('43-1');
    const spaced = blockText(linesIn([word('공학수학', 30, 0), word('61-3', 42, 1), word('20/61-102', 54, 2)], BOX));
    expect(linkRoom(spaced.room, FEW_PLACES)).toBeNull();
  });
});

describe('a name printed cut with `…`', () => {
  it('joins the one whole name that starts with it, however short', () => {
    expect(
      mergeClasses([
        { name: '스튜디오', marked: true, time: time('friday', '13:00', '13:50') },
        { name: '스튜디오 뮤직 메이킹', time: time('friday', '14:00', '15:50') },
      ]),
    ).toEqual([
      {
        name: '스튜디오 뮤직 메이킹',
        times: [time('friday', '13:00', '13:50'), time('friday', '14:00', '15:50')],
      },
    ]);
  });

  it('stays a class of its own when two whole names, or none, start with it', () => {
    expect(
      mergeClasses([
        { name: '물리', marked: true, time: time('monday', '09:00', '10:00') },
        { name: '물리학', time: time('tuesday', '09:00', '10:00') },
        { name: '물리학실험', time: time('wednesday', '09:00', '10:00') },
      ]).map((lesson) => lesson.name),
    ).toEqual(['물리', '물리학', '물리학실험']);
    expect(
      mergeClasses([{ name: '화학', marked: true, time: time('monday', '09:00', '10:00') }]).map(
        (lesson) => lesson.name,
      ),
    ).toEqual(['화학']);
  });
});

describe('the hour labels in other forms', () => {
  const block: DrawnBlock = { day: 1, start: 13, end: 14.25, colour: BLUE, text: ['자료구조'] };
  it.each(LABEL_FORMS)('read %s like plain numbers', (_, shown) => {
    expect(summary(readTimetable(screenshot([block], labels(shown)), []))).toEqual([
      '자료구조 tuesday 13:00-14:15 - -',
    ]);
  });

  it('read a half-hour label (9:30) at its half hour, not at its hour', () => {
    expect(summary(readTimetable(screenshot([block], labels(halfHour, 0.5)), []))).toEqual([
      '자료구조 tuesday 13:00-14:15 - -',
    ]);
  });

  it('fit an hour as tall as a third of the picture: a zoomed or scrolled timetable with 3 hours on screen', () => {
    const tall = [9, 10, 11].map((hour, index) => ({ hour, y: 60 + index * 230, top: 55 + index * 230 }));
    expect(fitHourLabels(tall, HEIGHT)?.fit.line.a).toBeCloseTo(230, 6);
  });
});

describe('the day header in other forms', () => {
  it.each([
    [['월요일', '화요일', '수요일', '목요일', '금요일']],
    [['Mon', 'Tue', 'Wed', 'Thu', 'Fri']],
    [['MON', 'TUE', 'WED', 'THU', 'FRI']],
  ])('reads %j as the five weekdays', (names) => {
    const lines = names.map((name, index) => line(name, LEFT + index * COLUMN + COLUMN / 2 - 12, 95, 0.5, 24));
    const header = findHeader(wordsOf(screenshot([], lines)), 330);
    expect(header?.columns.map((column) => column.weekday)).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]);
  });
});

describe('what already worked, kept working', () => {
  it('reads an English name, a 30-minute class and a class at 22:00 in a timetable from 8 to 23', () => {
    const reading = readTimetable(
      screenshot(
        [
          { day: 0, start: 10, end: 11.5, colour: BLUE, text: ['Intro to', 'Machine', 'Learning', '301-118'] },
          { day: 1, start: 10, end: 10.5, colour: ORANGE, text: ['근장'] },
          { day: 2, start: 22, end: 23, colour: GREEN, text: ['야간', '세미나'] },
        ],
        headerLines().concat(labelLines(8, 23)),
      ),
      PLACES,
    );
    expect(summary(reading)).toEqual([
      'IntrotoMachineLearning monday 10:00-11:30 301 118',
      '근장 tuesday 10:00-10:30 - -',
      '야간세미나 wednesday 22:00-23:00 - -',
    ]);
    expect(reading.kind === 'read' ? reading.classes[0]?.name : '').toBe('Intro to Machine Learning');
  });
});
