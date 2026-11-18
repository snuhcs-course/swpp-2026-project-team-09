/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { isTimetableReading } from '@/api/server/timetable-reading-client';
import type { ServerTimetableReading } from '@/api/timetable-reading-types';
import type { Place } from '@/api/types';
import type { Reading } from '@/features/timetable-ocr/read-timetable';
import { chosenReading, readingFromServer } from '@/features/timetable-ocr/server-reading';
import { agreeToReading, forgetReadingAgreement, readingAgreed } from '@/storage/reading-notice';

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
  it('counts the blocks the phone kept back once when the server placed blocks on its grid', () => {
    const reading = readingFromServer({ ...READ, usedGrid: true }, PLACES, [
      { column: 3, reason: 'too-narrow' },
      { column: 3, reason: 'too-narrow' },
      { column: 0, reason: 'start-uncertain' },
    ]);
    expect(reading.kind === 'read' ? reading.leftOut.map(({ reason }) => reason) : []).toEqual([
      'end-uncertain',
      'too-narrow',
      'too-narrow',
      'start-uncertain',
    ]);
  });

  it('does not add them when the server read the whole picture, or does not say, so that none is counted twice', () => {
    // The whole picture's reading reported the block cut at its top itself, as `cut`.
    const whole = {
      ...READ,
      leftOut: [{ weekday: 'monday', name: '논리설계', start: '09:00', end: null, reason: 'cut' }],
    } satisfies ServerTimetableReading;
    for (const server of [{ ...whole, usedGrid: false }, whole]) {
      const reading = readingFromServer(server, PLACES, [{ column: 0, reason: 'start-uncertain' }]);
      expect(reading.kind === 'read' ? reading.leftOut.map(({ reason }) => reason) : []).toEqual(['end-uncertain']);
    }
  });

  it('takes `usedGrid` as a boolean or absent', () => {
    expect(isTimetableReading({ ...READ, usedGrid: true })).toBe(true);
    expect(isTimetableReading({ ...READ, usedGrid: 'yes' })).toBe(false);
  });

  it('is no timetable when the server found none', () => {
    expect(readingFromServer({ kind: 'none' }, PLACES).kind).toBe('none');
  });
});

describe('the reading the import takes', () => {
  const server = readingFromServer(READ, PLACES);
  const own: Reading = {
    kind: 'read',
    title: null,
    classes: [
      { name: '수학 1', times: [{ weekday: 'monday', start: '09:00', end: '10:15', room: null, placeId: null }] },
    ],
    leftOut: [],
  };
  const empty: Reading = { kind: 'read', title: null, classes: [], leftOut: [] };
  const none: Reading = { kind: 'none', reason: 'no-hours' };

  it("is the server's when it holds a class, without the phone's own being read", async () => {
    const phone = jest.fn(() => Promise.resolve(own));
    await expect(chosenReading(server, phone)).resolves.toBe(server);
    expect(phone).not.toHaveBeenCalled();
  });

  it("is the phone's own when the server found no timetable, or no class", async () => {
    for (const fromServer of [readingFromServer({ kind: 'none' }, PLACES), empty]) {
      // oxlint-disable-next-line no-await-in-loop -- one case after the other
      await expect(chosenReading(fromServer, () => Promise.resolve(own))).resolves.toBe(own);
    }
  });

  it("is the server's none when the phone found none either, so the User is told no timetable was found", async () => {
    const fromServer = readingFromServer({ kind: 'none' }, PLACES);
    await expect(chosenReading(fromServer, () => Promise.resolve(none))).resolves.toBe(fromServer);
    await expect(chosenReading(fromServer, () => Promise.resolve(null))).resolves.toBe(fromServer);
    await expect(chosenReading(null, () => Promise.resolve(null))).resolves.toBeNull();
  });
});

describe('the notice before the first send', () => {
  it('is remembered on a yes and forgotten again', async () => {
    await agreeToReading();
    await expect(readingAgreed()).resolves.toBe(true);
    await forgetReadingAgreement();
    await expect(readingAgreed()).resolves.toBe(false);
  });
});
