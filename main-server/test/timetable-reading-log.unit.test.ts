/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 * 2026-11-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { checkedReading, servedLeftOut } from '../src/timetable-reading/reading-checks.js';
import { leftOutLine } from '../src/timetable-reading/reading-log.js';
import { type ModelAnswer } from '../src/timetable-reading/reading-model.js';

// P05 ticket 90: each block a timetable reading leaves out is one WARN line with what diagnoses the drop, its day, its
// start and end, the reason and the numbers behind it, and none of the words read: Production forwards every WARN to
// Slack, and what was read is never logged.

type Block = ModelAnswer['blocks'][number];

const AXIS = ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

const block = (day: string, start: string, end: string, nameLines: string[], room: string | null): Block => ({
  day,
  start,
  end,
  nameLines,
  name: nameLines.join(' '),
  room,
  cut: false,
});

// One block for each reason a block is left out, each with its own class words and room.
const ANSWER: ModelAnswer = {
  title: null,
  axis: AXIS,
  blocks: [
    { ...block('월', '9:00', '10:15', ['논리설계'], '302-310-2'), cut: true },
    block('X', '9:00', '10:15', ['요일없는과목'], '43-1'),
    block('화', '7:00', '8:15', ['새벽과목'], '26-404'),
    block('수', '11:00', '11:05', ['짧은과목'], '500-L308'),
    { ...block('목', '11:00', '12:15', ['인공지능', '개론'], '301-118'), name: '인공 지능개론' },
    block('목', '13:00', '14:15', ['…'], '83-404'),
    block(
      '금',
      '13:00',
      '15:50',
      Array.from({ length: 14 }, (_, index) => `파운데이션${index}`),
      '302-106',
    ),
    block('금', '9:00', '10:15', ['통계학'], '28-102'),
    block('금', '10:00', '11:15', ['통계학'], '28-103'),
  ],
};
const WORDS = [
  '논리설계',
  '요일없는과목',
  '새벽과목',
  '짧은과목',
  '인공',
  '파운데이션',
  '통계학',
  '302',
  '43-1',
  '26-404',
  '500',
  '83-404',
  '28-10',
];

describe('the line of a block left out', () => {
  it('names its day, start and end, the reason and the numbers behind it', () => {
    expect(
      leftOutLine({
        weekday: 'friday',
        name: '인공지능특강',
        start: '13:00',
        end: '15:50',
        reason: 'too-long',
        measure: 'name lines 14, at most 12',
      }),
    ).toBe(
      'A timetable reading left out a block: friday 13:00–15:50, too-long: its text is longer than a timetable block holds (name lines 14, at most 12)',
    );
  });

  it('holds none of the words read, for every reason a block is left out', () => {
    const reading = checkedReading(ANSWER);
    const leftOut = reading.kind === 'read' ? reading.leftOut : [];
    const lines = leftOut.map((one) => leftOutLine(one));

    expect(leftOut.map(({ reason }) => reason).toSorted()).toEqual(
      [
        'cut',
        'name-unchecked',
        'no-day',
        'no-name',
        'outside-day',
        'time-unreadable',
        'too-long',
        'too-many-times',
      ].toSorted(),
    );
    for (const line of lines) {
      expect(WORDS.filter((word) => line.includes(word))).toEqual([]);
    }
    expect(lines.find((line) => line.includes('too-long'))).toContain('name lines 14, at most 12');
  });

  it('is never answered to the app: the route leaves the numbers out', () => {
    const reading = checkedReading(ANSWER);
    const served = servedLeftOut(reading.kind === 'read' ? reading.leftOut : []);

    expect(served.filter((one) => 'measure' in one)).toEqual([]);
  });
});
