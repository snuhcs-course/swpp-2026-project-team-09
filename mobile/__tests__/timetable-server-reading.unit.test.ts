/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { isTimetableReading } from '@/api/server/timetable-reading-client';
import type { ServerTimetableReading } from '@/api/timetable-reading-types';
import type { Place } from '@/api/types';
import { readingFromServer } from '@/features/timetable-ocr/server-reading';

// P15-52: the main server's reading of a screenshot, checked as it comes and turned into the phone reader's shape.

function place(number: string): Place {
  return { id: `place-${number}`, number, name: number, latitude: 37.45, longitude: 126.95 };
}

const PLACES = [place('302'), place('43-1'), place('8')];

const READ: ServerTimetableReading = {
  kind: 'read',
  title: '연습3',
  classes: [
    {
      name: '대학영어 2: 말하기',
      times: [
        { weekday: 'tuesday', start: '11:00', end: '12:15', room: '8-408' },
        { weekday: 'thursday', start: '11:00', end: '12:15', room: '8-408' },
      ],
    },
    {
      name: '대학 글쓰기 2: 과학기술글쓰기',
      times: [{ weekday: 'tuesday', start: '15:30', end: '16:45', room: '43-1-403' }],
    },
    { name: '축구', times: [{ weekday: 'wednesday', start: '15:00', end: '16:50', room: null }] },
    { name: '세미나', times: [{ weekday: 'friday', start: '10:00', end: '11:00', room: '999-101' }] },
  ],
  leftOut: [{ weekday: null, name: '논리설계', start: '19:00', end: null, reason: 'cut' }],
};

describe('the main server’s reading', () => {
  it('is checked field by field', () => {
    expect(isTimetableReading(READ)).toBe(true);
    expect(isTimetableReading({ kind: 'none' })).toBe(true);
    expect(
      isTimetableReading({ ...READ, classes: [{ name: '수학', times: [{ weekday: 'monday', start: '9:00' }] }] }),
    ).toBe(false);
    expect(isTimetableReading({ kind: 'read', title: null, classes: [] })).toBe(false);
    expect(isTimetableReading(null)).toBe(false);
  });

  it('links each room to the building that leads it, keeps a room no building leads as printed, and counts what was left out', () => {
    const reading = readingFromServer(READ, PLACES);
    expect(reading).toEqual({
      kind: 'read',
      title: '연습3',
      classes: [
        {
          name: '대학영어 2: 말하기',
          times: [
            { weekday: 'tuesday', start: '11:00', end: '12:15', room: '408', placeId: 'place-8' },
            { weekday: 'thursday', start: '11:00', end: '12:15', room: '408', placeId: 'place-8' },
          ],
        },
        {
          name: '대학 글쓰기 2: 과학기술글쓰기',
          times: [{ weekday: 'tuesday', start: '15:30', end: '16:45', room: '403', placeId: 'place-43-1' }],
        },
        { name: '축구', times: [{ weekday: 'wednesday', start: '15:00', end: '16:50', room: null, placeId: null }] },
        {
          name: '세미나',
          times: [{ weekday: 'friday', start: '10:00', end: '11:00', room: '999-101', placeId: null }],
        },
      ],
      leftOut: [{ weekday: null, name: '논리설계', start: '19:00', end: null, reason: 'end-uncertain' }],
    });
  });
});

describe('the main server’s reading with what the phone kept back', () => {
  it('counts the blocks the phone found and did not send among what was left out', () => {
    const reading = readingFromServer(READ, PLACES, [
      { column: 3, reason: 'too-narrow' },
      { column: 3, reason: 'too-narrow' },
    ]);
    expect(reading.kind === 'read' ? reading.leftOut.map(({ reason }) => reason) : []).toEqual([
      'end-uncertain',
      'too-narrow',
      'too-narrow',
    ]);
  });

  it('is no timetable when the server found none', () => {
    expect(readingFromServer({ kind: 'none' }, PLACES).kind).toBe('none');
  });
});
