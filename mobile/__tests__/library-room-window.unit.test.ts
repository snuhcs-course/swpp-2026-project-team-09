/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { bookKeyOf, inRoomWindow, isWaitingCard, windowWords } from '@/library/cards/room-window';

// A book card's key as the main server makes it (`library-card.ts`), with and without `:wait`, and the booking window of
// a room: today to 3 days later in Korea, by the site's DAY_TO 3 (P05 ticket 07).

const NOW = new Date('2026-11-02T16:00:00+09:00');

describe('bookKeyOf', () => {
  it('reads a book key as before', () => {
    expect(bookKeyOf('book:4F-group-6:2026-11-02:1700:60')).toEqual({
      spaceId: '4F-group-6',
      date: '2026-11-02',
      start: '17:00',
      minutes: 60,
      seat: null,
      equipment: null,
      waitsForWindow: false,
    });
  });

  it('reads `:wait` as a key that waits for the window', () => {
    expect(bookKeyOf('book:4F-group-6:2026-11-23:0900:180:wait')).toMatchObject({
      date: '2026-11-23',
      start: '09:00',
      minutes: 180,
      waitsForWindow: true,
    });
  });

  it('reads a seat and an equipment before `:wait`', () => {
    expect(bookKeyOf('book:6F-studio:2026-11-09:1300:120:s=G412:e=pc-1:wait')).toMatchObject({
      seat: 'G412',
      equipment: 'pc-1',
      waitsForWindow: true,
    });
  });

  it.each([
    ['a seats key', 'seats:7F-7A-zone2:2026-11-02'],
    ['a cancel key', 'cancel:-:-:-'],
    ['a start without minutes', 'book:4F-group-6:2026-11-02:17:60'],
    ['a part after `:wait`', 'book:4F-group-6:2026-11-02:1700:60:wait:more'],
    ['`wait` without its colon', 'book:4F-group-6:2026-11-02:1700:60wait'],
  ])('is null for %s', (_, key) => {
    expect(bookKeyOf(key)).toBeNull();
  });
});

describe('inRoomWindow', () => {
  it.each([
    ['today', '2026-11-02', NOW, true],
    ['3 days later', '2026-11-05', NOW, true],
    ['4 days later', '2026-11-06', NOW, false],
    ['4 days later, a minute before midnight', '2026-11-06', new Date('2026-11-02T23:59:00+09:00'), false],
    ['3 days later from the next day in Korea', '2026-11-06', new Date('2026-11-03T00:00:00+09:00'), true],
  ])('%s → %s', (_, date, now, expected) => {
    expect(inRoomWindow(date, now)).toBe(expected);
  });
});

describe('isWaitingCard', () => {
  it.each([
    ['a waiting key after the window', 'book:4F-group-6:2026-11-09:1700:180:wait', true],
    ['a waiting key the window now holds', 'book:4F-group-6:2026-11-05:1700:180:wait', false],
    ['a key without `:wait`', 'book:4F-group-6:2026-11-09:1700:180', false],
    ['a seats key', 'seats:4F-group-6:2026-11-09', false],
  ])('%s → %s', (_, key, expected) => {
    expect(isWaitingCard({ key }, NOW)).toBe(expected);
  });
});

describe('windowWords', () => {
  it('names the day the window opens, 3 days before, at 09:00', () => {
    expect(windowWords('2026-11-09')).toBe('11월 6일 09:00 예약 창이 열리면 예약할 수 있어요');
  });

  it('crosses the month', () => {
    expect(windowWords('2026-12-02')).toBe('11월 29일 09:00 예약 창이 열리면 예약할 수 있어요');
  });
});
