/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { axisHours, dayOf, minutesOf } from '../src/timetable-reading/labels.js';
import { checkedName, checkedReading, checkedRoom, completedNames } from '../src/timetable-reading/reading-checks.js';
import { type ModelAnswer } from '../src/timetable-reading/reading-model.js';

// P15-52: the code's half of reading a timetable screenshot, on answers written here. The saved answers of the real
// model are checked in timetable-reading-answers.unit.test.ts.

type Block = ModelAnswer['blocks'][number];

function block(day: string, start: string, end: string, name: string, room: string | null = null): Block {
  return { day, start, end, nameLines: [name], name, room, cut: false };
}

const TWELVE_HOUR = ['9', '10', '11', '12', '1', '2', '3', '4', '5', '6'];
const TO_18 = ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
const TO_21 = [...TO_18, '19', '20', '21'];

describe('the hour axis', () => {
  it('reads a 12-hour axis on past noon (everytime-2)', () => {
    expect(axisHours(TWELVE_HOUR)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(minutesOf('1:45', TWELVE_HOUR, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18])).toEqual([13 * 60 + 45]);
    expect(minutesOf('12:15', TWELVE_HOUR, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18])).toEqual([12 * 60 + 15]);
    expect(minutesOf('9:30', TWELVE_HOUR, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18])).toEqual([9 * 60 + 30]);
    // A 24-hour time the model gave on a 12-hour axis is taken when it is on the axis.
    expect(minutesOf('17:00', TWELVE_HOUR, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18])).toEqual([17 * 60]);
  });

  it('reads 24-hour axes to 18 and to 21 (snutt-4, snutt-dark-1)', () => {
    expect(axisHours(TO_18)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(axisHours(TO_21)?.at(-1)).toBe(21);
    expect(minutesOf('20:20', TO_21, axisHours(TO_21) ?? [])).toEqual([20 * 60 + 20]);
  });
});

describe('the hour axis at its ends', () => {
  it('takes the hour after the last label for a block ending on the grid bottom line', () => {
    expect(minutesOf('19:00', TO_18, axisHours(TO_18) ?? [])).toEqual([19 * 60]);
    expect(minutesOf('7:00', TWELVE_HOUR, axisHours(TWELVE_HOUR) ?? [])).toEqual([19 * 60]);
  });

  it('takes the reading of a printed hour that ends after the start, on a 12-hour axis past 12 hours (everytime-1)', () => {
    const labels = ['9', '10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8'];
    const hours = axisHours(labels) ?? [];
    expect(minutesOf('9:00', labels, hours)).toEqual([9 * 60, 21 * 60]);
    const reading = checkedReading({
      title: null,
      axis: labels,
      blocks: [block('월', '7:00', '9:00', '컴퓨터프로그래밍')],
    });
    expect(reading.kind === 'read' ? reading.classes[0]?.times : []).toEqual([
      { weekday: 'monday', start: '19:00', end: '21:00', room: null },
    ]);
  });

  it('snaps a time to five minutes and refuses one off the axis', () => {
    expect(minutesOf('10:48', TO_18, axisHours(TO_18) ?? [])).toEqual([10 * 60 + 50]);
    expect(minutesOf('7:00', TO_18, axisHours(TO_18) ?? [])).toEqual([]);
    expect(minutesOf('noon', TO_18, axisHours(TO_18) ?? [])).toEqual([]);
  });

  it('is no timetable when the labels are not consecutive hours or too few', () => {
    expect(axisHours(['9', '11', '12'])).toBeNull();
    expect(axisHours(['9'])).toBeNull();
    expect(axisHours(['학점', '3.46'])).toBeNull();
    expect(checkedReading({ title: null, axis: [], blocks: [] })).toEqual({ kind: 'none' });
  });
});

describe('the name and the room', () => {
  it('keeps a name that is its lines joined, with or without a space at each break', () => {
    expect(checkedName('컴퓨터프로그래밍', ['컴퓨터프로그래', '밍'])).toBe('컴퓨터프로그래밍');
    expect(checkedName('컴퓨터의 개념 및 실습', ['컴퓨터의 개념', '및 실습'])).toBe('컴퓨터의 개념 및 실습');
    expect(checkedName('대학영어 2: 말하기', ['대학영어 2: 말', '하기'])).toBe('대학영어 2: 말하기');
  });

  it('refuses a name that adds, drops or changes a letter of its lines', () => {
    expect(checkedName('컴퓨터 프로그래밍', ['컴퓨터프로그래', '밍'])).toBeNull();
    expect(checkedName('컴퓨터프로그래밍 1', ['컴퓨터프로그래', '밍'])).toBeNull();
  });

  it('keeps a room of the room pattern as printed, and none for other text', () => {
    expect(checkedRoom('302-311-1')).toBe('302-311-1');
    expect(checkedRoom('500 - L309')).toBe('500-L309');
    expect(checkedRoom('26-B102')).toBe('26-B102');
    expect(checkedRoom('43-1-403')).toBe('43-1-403');
    expect(checkedRoom('온라인')).toBeNull();
    expect(checkedRoom(null)).toBeNull();
  });

  it('completes a name printed cut with … only when one whole name starts with it', () => {
    expect(completedNames(['스튜디오…', '스튜디오 뮤직 메이킹'])).toEqual([
      '스튜디오 뮤직 메이킹',
      '스튜디오 뮤직 메이킹',
    ]);
    expect(completedNames(['물리…', '물리학', '물리학실험'])).toEqual(['물리', '물리학', '물리학실험']);
    expect(completedNames(['컴퓨팅 살펴…'])).toEqual(['컴퓨팅 살펴']);
  });
});

describe('a reading of classes', () => {
  it('makes one class of equal names, each time with its own room', () => {
    const reading = checkedReading({
      title: '1',
      axis: TO_21,
      blocks: [
        block('수', '18:30', '20:20', '프로그래밍연습', '302-105'),
        block('월', '16:00', '17:50', '프로그래밍연습', '301-118'),
      ],
    });
    expect(reading).toEqual({
      kind: 'read',
      title: '1',
      classes: [
        {
          name: '프로그래밍연습',
          times: [
            { weekday: 'monday', start: '16:00', end: '17:50', room: '301-118' },
            { weekday: 'wednesday', start: '18:30', end: '20:20', room: '302-105' },
          ],
        },
      ],
      leftOut: [],
    });
  });

  it('keeps names that differ apart', () => {
    const reading = checkedReading({
      title: null,
      axis: TWELVE_HOUR,
      blocks: [
        block('월', '11:00', '11:50', '수학 1', '500-L301'),
        block('금', '11:00', '12:50', '수학연습 1', '500-L309'),
        block('화', '5:00', '6:15', '물리학 1', '56-105'),
        block('목', '2:00', '3:50', '물리학실험 1', '26-304'),
      ],
    });
    expect(reading.kind === 'read' ? reading.classes.map(({ name }) => name) : []).toEqual([
      '수학 1',
      '물리학 1',
      '물리학실험 1',
      '수학연습 1',
    ]);
  });
});

describe('a reading of what fails a check', () => {
  it('leaves out, with the reason, a cut block, a time off the axis, a name not of its lines and a crossing time', () => {
    const reading = checkedReading({
      title: null,
      axis: TO_18,
      blocks: [
        { ...block('월', '17:00', '18:50', '논리설계', '302-310-2'), cut: true },
        block('화', '7:00', '8:15', '자료구조'),
        { ...block('수', '11:00', '12:15', '인공지능 개론'), nameLines: ['인공지능'] },
        block('목', '11:00', '12:15', '통계학'),
        block('목', '12:00', '13:15', '통계학'),
        block('금', '11:00', '11:05', '짧은 것'),
        block('X', '11:00', '12:00', '요일 없음'),
      ],
    });
    expect(reading.kind === 'read' ? reading.leftOut.map(({ reason }) => reason) : []).toEqual([
      'cut',
      'time-unreadable',
      'name-unchecked',
      'outside-day',
      'no-day',
      'too-many-times',
    ]);
    expect(reading.kind === 'read' ? reading.classes : []).toEqual([
      { name: '통계학', times: [{ weekday: 'thursday', start: '11:00', end: '12:15', room: null }] },
    ]);
  });
});

describe('labels of any layout', () => {
  it('reads days as letters, words and English', () => {
    expect(['월', '화요일', '(수)', 'Thu', 'FRI', 'Saturday', '일'].map((label) => dayOf(label))).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]);
    expect(dayOf('학점')).toBeNull();
  });

  it('reads hour labels written 09, 9:00, 오전 9시, 오후 1시 and 9 AM', () => {
    expect(axisHours(['09', '10', '11'])).toEqual([9, 10, 11]);
    expect(axisHours(['9:00', '10:00'])).toEqual([9, 10]);
    expect(axisHours(['오전 11시', '오후 12시', '오후 1시'])).toEqual([11, 12, 13]);
    expect(axisHours(['11 AM', '12 PM', '1 PM'])).toEqual([11, 12, 13]);
    expect(axisHours(['8', '9', '10'])).toEqual([8, 9, 10]);
  });
});

describe('an answer past the bounds', () => {
  it('leaves out a block of 30 name lines quickly, unread, and still reads the others', () => {
    const lines = Array.from({ length: 30 }, (_, index) => `줄${index}`);
    const started = performance.now();
    const reading = checkedReading({
      title: null,
      axis: TO_18,
      blocks: [
        { day: '월', start: '11:00', end: '12:15', nameLines: lines, name: lines.join(' '), room: null, cut: false },
        {
          day: '화',
          start: '11:00',
          end: '12:15',
          nameLines: ['대학영어 2: 말', '하기'],
          name: '대학영어 2: 말하기',
          room: '8-408',
          cut: false,
        },
      ],
    });
    expect(performance.now() - started).toBeLessThan(100);
    expect(reading.kind === 'read' ? reading.leftOut.map(({ reason }) => reason) : []).toEqual(['too-long']);
    expect(reading.kind === 'read' ? reading.classes.map(({ name }) => name) : []).toEqual(['대학영어 2: 말하기']);
  });

  it('checks a name against 6 lines in linear time', () => {
    const lines = ['가', '나', '다', '라', '마', '바'];
    expect(checkedName('가나 다라마 바', lines)).toBe('가나 다라마 바');
    expect(checkedName('가나다라마바사', lines)).toBeNull();
    expect(checkedName('가 나다라마바', [...lines.slice(0, 1), '나 다', ...lines.slice(3)])).toBeNull();
  });

  it('is no timetable when the axis has more labels than a day has hours, or labels too long', () => {
    expect(axisHours(Array.from({ length: 30 }, (_, index) => String(index)))).toBeNull();
    expect(axisHours(['9', `${' '.repeat(5000)}10`])).toBeNull();
    expect(dayOf(`월${' '.repeat(5000)}`)).toBeNull();
  });
});
