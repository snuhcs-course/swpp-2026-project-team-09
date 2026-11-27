/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest, SubQuest } from '@/api/types';
import { READING_ROOM } from '@/api/mock/data/library';
import { dayAround, fixedOnDay, stretchesOn, wordsOn } from '@/features/assistant/booking-day';
import { bookingBandOf } from '@/screens/main/answer/booking-band';

// The study-seat bar's day (P01 ticket after 03): the User's Classes and Quests of the booking's date on its track,
// the nearest one before and after the band named, and a clause when the band runs into one. Expected values: a
// Monday with a Class at 301동 until 10:45, one at 302동 from 15:30 to 17:15, and a dinner Quest from 18:00 to 19:00,
// worked by hand; minutes are minutes of the day.
const DATE = '2026-11-23';

function sub(startsAt: string | null, endsAt: string | null, label: string, cancelled = false): SubQuest {
  return {
    id: `s-${label}-${String(startsAt)}`,
    attending: true,
    title: label,
    startsAt,
    endsAt,
    place: { placeId: null, label, latitude: null, longitude: null },
    completion: 'by_time',
    cancelled,
    done: false,
    ended: false,
  };
}

function quest(id: string, title: string, subQuests: SubQuest[], classQuest = false, takenAlone = false): Quest {
  return {
    id,
    title,
    globalEvent: null,
    leader: null,
    capacity: 1,
    joinPolicy: 'closed',
    holders: [],
    subQuests,
    classQuest,
    takenAlone,
    waitingJoinRequests: 0,
    board: null,
    description: '',
    createdAt: null,
  };
}

const at = (clock: string, date = DATE): string => `${date}T${clock}:00+09:00`;

const QUESTS: Quest[] = [
  quest('c1', '자료구조', [sub(at('09:00'), at('10:45'), '301동 118호')], true),
  quest('c2', '운영체제', [sub(at('15:30'), at('17:15'), '302동 208호')], true),
  quest('q1', '저녁 약속', [sub(at('18:00'), at('19:00'), '학생회관')]),
  // Not of the day, cancelled, or without an end: none is a fixed thing of the date.
  quest('q2', '내일 스터디', [sub(at('14:00', '2026-11-24'), at('16:00', '2026-11-24'), '중앙도서관')]),
  quest('q3', '취소된 약속', [sub(at('12:00'), at('13:00'), '학생회관', true)]),
  quest('q4', '시간 없는 일', [sub(at('11:00'), null, '어딘가')]),
  // The booking itself, a seat taken alone at the band's own span.
  quest('b1', '관정도서관 7층 열람실', [sub(at('14:00'), at('17:00'), '관정도서관')], false, true),
];

const BAND = { start: 14 * 60, end: 17 * 60 };
// The Classes' Sub Quest ids, the ids of their times, by which the conversation leaves one out (P01 ticket 40).
const CLASS_301 = `s-301동 118호-${at('09:00')}`;
const CLASS_302 = `s-302동 208호-${at('15:30')}`;

describe('fixedOnDay', () => {
  it("keeps the date's Classes and Quests with a start and an end, and leaves out the booking itself", () => {
    expect(fixedOnDay(QUESTS, DATE, BAND)).toEqual([
      { id: CLASS_301, start: 9 * 60, end: 10 * 60 + 45, words: '301동 수업', isClass: true },
      { id: CLASS_302, start: 15 * 60 + 30, end: 17 * 60 + 15, words: '302동 수업', isClass: true },
      { id: `s-학생회관-${at('18:00')}`, start: 18 * 60, end: 19 * 60, words: '저녁 약속', isClass: false },
    ]);
  });
});

const FIXED = fixedOnDay(QUESTS, DATE, BAND);

// Partitions: a band between two things; a band that runs into a Class; one that runs into a Quest; nothing around.
describe('dayAround', () => {
  it('names the nearest thing before and after a band that runs into neither', () => {
    expect(dayAround(FIXED, { start: 11 * 60, end: 14 * 60 })).toEqual({
      before: '10:45 301동 수업 끝',
      after: '15:30 302동 수업',
      clash: null,
    });
  });

  it('says the Class the band runs into, and names the next thing after the band', () => {
    expect(dayAround(FIXED, BAND)).toEqual({
      before: '10:45 301동 수업 끝',
      after: '18:00 저녁 약속',
      clash: '15:30 수업과 겹쳐요',
    });
  });

  it('says a Quest by its title, with 과 or 와 as its last syllable takes', () => {
    expect(dayAround(FIXED, { start: 17 * 60 + 30, end: 18 * 60 + 30 }).clash).toBe('18:00 저녁 약속과 겹쳐요');
  });

  it('names nothing on a day without fixed things', () => {
    expect(dayAround([], BAND)).toEqual({ before: null, after: null, clash: null });
  });
});

describe('wordsOn', () => {
  it("says the band's span and length while it runs into nothing", () => {
    expect(wordsOn({ start: 11 * 60, end: 14 * 60 }, FIXED)).toEqual({ words: '11:00–14:00 · 3시간', clash: false });
  });

  it('says the span and the clash in place of the length', () => {
    expect(wordsOn(BAND, FIXED)).toEqual({ words: '14:00–17:00 · 15:30 수업과 겹쳐요', clash: true });
  });
});

describe('stretchesOn', () => {
  it("cuts the fixed things to the track's hours and drops those outside", () => {
    expect(stretchesOn(FIXED, { open: 10 * 60, close: 18 * 60 + 30 })).toEqual([
      { start: 10 * 60, end: 10 * 60 + 45 },
      { start: 15 * 60 + 30, end: 17 * 60 + 15 },
      { start: 18 * 60, end: 18 * 60 + 30 },
    ]);
  });
});

// The seat's band with a Class the conversation leaves out (P01 ticket 40): free, off the lane and out of the card's
// words, and drawn apart as every answer's band draws it. Partitions: none left out; the 15:30 Class left out.
// Expected values: the booking 14:00–17:00, which runs into the 15:30 Class at 302동.
// The labels of the User's busy stretches on the band's lane.
function busyOf(band: ReturnType<typeof bookingBandOf>): (string | undefined)[] {
  return (band.lanes[0]?.busy ?? []).map(({ label }) => label);
}

describe("A seat's band, a Class left out", () => {
  const slot = { date: DATE, start: '14:00', minutes: 180 };
  const now = new Date(at('13:00'));

  it('keeps the Class on the lane and the clash in the words with none left out', () => {
    const band = bookingBandOf(slot, READING_ROOM, QUESTS, now);

    expect(busyOf(band)).toContain('302동 수업');
    expect(band.text).toContain('수업과 겹쳐요');
    expect(band).not.toHaveProperty('skipped');
  });

  it('draws it apart, off the lane and out of the words, when it is left out', () => {
    const band = bookingBandOf(slot, READING_ROOM, QUESTS, now, now, [CLASS_302]);

    expect(busyOf(band)).not.toContain('302동 수업');
    expect(band.text).not.toContain('겹쳐요');
    expect(band.skipped).toEqual([{ id: CLASS_302, startAt: at('15:30'), endAt: at('17:15'), label: '302동 수업' }]);
  });
});
