/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { checkedReading } from '../src/timetable-reading/reading-checks.js';
import { blockList, type ModelAnswer } from '../src/timetable-reading/reading-model.js';
import {
  blocksAnswer,
  fadingEnd,
  nearMiss,
  nearMissGroups,
  withSecondLook,
} from '../src/timetable-reading/second-look.js';

// P15-52: the blocks the phone sends and the second look at near misses, on answers written here.

type Block = ModelAnswer['blocks'][number];

function block(day: string, start: string, end: string, name: string, room: string | null = null): Block {
  return { day, start, end, nameLines: [name], name, room, cut: false };
}

const TO_18 = ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

describe('one class read slightly differently on two days', () => {
  it('is a near miss to look at again: one character in four apart, of one colour', () => {
    expect(nearMiss({ name: '컴퓨터프로그래밍' }, { name: '컴퓨터프로그레밍' })).toBe(true);
    expect(nearMiss({ name: '회계원리', colour: [250, 200, 40] }, { name: '회계원라', colour: [248, 198, 42] })).toBe(
      true,
    );
  });

  it('is never a near miss for names that differ as classes do', () => {
    expect(nearMiss({ name: '수학 1' }, { name: '수학연습 1' })).toBe(false);
    expect(nearMiss({ name: '물리학 1' }, { name: '물리학실험 1' })).toBe(false);
    expect(nearMiss({ name: '프로그래밍연습' }, { name: '프로그래밍의 원리' })).toBe(false);
    expect(nearMiss({ name: '수학 1' }, { name: '수학 2' })).toBe(false);
    expect(nearMiss({ name: '생물학' }, { name: '통계학' })).toBe(false);
    // Of two colours: two classes, however close their names.
    expect(nearMiss({ name: '회계원리', colour: [250, 200, 40] }, { name: '회계원론', colour: [60, 120, 230] })).toBe(
      false,
    );
  });
});

describe('a near miss looked at again', () => {
  it('groups the blocks to read again, with every block of either name', () => {
    expect(
      nearMissGroups([
        { name: '컴퓨터프로그래밍' },
        { name: '인공지능' },
        { name: '컴퓨터프로그레밍' },
        { name: '컴퓨터프로그래밍' },
      ]),
    ).toEqual([[0, 2, 3]]);
    expect(nearMissGroups([{ name: '수학 1' }, { name: '수학연습 1' }, { name: '수학 1' }])).toEqual([]);
  });
});

describe('a second look', () => {
  it('becomes one class when the second look reads one name, and stays two when it reads two', () => {
    const answer = {
      title: null,
      axis: TO_18,
      blocks: [
        block('화', '11:00', '12:15', '컴퓨터프로그래밍', '302-105'),
        block('목', '11:00', '12:15', '컴퓨터프로그레밍', '302-105'),
      ],
    };
    const again = (second: string): ReturnType<typeof checkedReading> =>
      checkedReading(
        withSecondLook(answer, [0, 1], {
          title: null,
          blocks: [
            { number: 1, nameLines: ['컴퓨터프로그래밍'], name: '컴퓨터프로그래밍', room: '302-105' },
            { number: 2, nameLines: [second], name: second, room: '302-105' },
          ],
        }),
      );
    const classes = (second: string): number => {
      const reading = again(second);
      return reading.kind === 'read' ? reading.classes.length : 0;
    };
    expect(classes('컴퓨터프로그래밍')).toBe(1);
    expect(classes('컴퓨터프로그레밍')).toBe(2);
  });

  it('is grouped by code over tidied names: NFC and spaces', () => {
    const decomposed = '수학 1'.normalize('NFD');
    const reading = checkedReading({
      title: null,
      axis: TO_18,
      blocks: [
        block('월', '11:00', '11:50', '수학  1'),
        { ...block('수', '11:00', '11:50', decomposed), nameLines: [decomposed] },
      ],
    });
    expect(reading.kind === 'read' ? reading.classes.map(({ name, times }) => [name, times.length]) : []).toEqual([
      ['수학 1', 2],
    ]);
  });
});

describe('the blocks the phone sends', () => {
  it('are listed to the model by day and 24-hour time, a fading one with its end asked', () => {
    expect(
      blockList([
        { day: '화', start: '11:00', end: '12:15' },
        { day: '월', start: '19:00', end: '20:50', fades: true },
      ]),
    ).toBe('1. 화 11:00–12:15\n2. 월 19:00–20:50?');
  });

  it('take the fading end the model read only when it is no earlier than the colour and at most 90 minutes after', () => {
    expect(fadingEnd('20:50', '20:50')).toBe('20:50');
    expect(fadingEnd('20:30', '20:50')).toBe('20:50');
    expect(fadingEnd('20:50', '19:30')).toBeNull();
    expect(fadingEnd('20:50', '23:00')).toBeNull();
    expect(fadingEnd('20:50', null)).toBeNull();
  });
});

describe('the classes of the blocks the phone sends', () => {
  it('are on the blocks own days and times; a block without text or a fading end not read is left out', () => {
    const reading = checkedReading(
      blocksAnswer(
        [
          { day: '화', start: '13:00', end: '14:15', fades: false },
          { day: '수', start: '15:00', end: '16:50' },
          { day: '월', start: '19:00', end: '20:20', fades: true },
          { day: '목', start: '19:00', end: '20:20', fades: true },
        ],
        {
          title: '1',
          blocks: [
            { number: 1, nameLines: ['이산수학'], name: '이산수학', room: '301-118' },
            { number: 2, nameLines: [], name: '', room: null },
            { number: 3, nameLines: ['논리설계'], name: '논리설계', room: '302-310-2', end: '20:50' },
            { number: 4, nameLines: ['논리설계'], name: '논리설계', room: '302-310-2', end: null },
          ],
        },
      ),
    );
    expect(reading).toEqual({
      kind: 'read',
      title: '1',
      classes: [
        { name: '논리설계', times: [{ weekday: 'monday', start: '19:00', end: '20:50', room: '302-310-2' }] },
        { name: '이산수학', times: [{ weekday: 'tuesday', start: '13:00', end: '14:15', room: '301-118' }] },
      ],
      leftOut: [
        { weekday: 'wednesday', name: '', start: '15:00', end: '16:50', reason: 'no-name' },
        { weekday: 'thursday', name: '논리설계', start: '19:00', end: '20:20', reason: 'cut' },
      ],
    });
  });
});
