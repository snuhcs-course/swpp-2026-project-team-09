/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryCardData } from '@/api/assistant-types';
import { koreaDateKey } from '@/korea-time';
import { dayAfter } from './times';

// A book card's key and the booking window of a room (P05 ticket 07). The main server makes the key
// (`library-card.ts`): `book:<space>:<date>:<HHMM>:<minutes>`, then `s=<seat>`, `e=<equipment>` and `wait` when given.
// `wait` is the card of a study plan for a date after the window: its room request gathers the consents first.

export interface BookKey {
  spaceId: string;
  date: string;
  start: string;
  minutes: number;
  seat: string | null;
  equipment: string | null;
  waitsForWindow: boolean;
}

const LABEL = '[A-Za-z0-9가-힣 ./-]{1,40}';
const BOOK_KEY = new RegExp(
  `^book:(?<spaceId>[A-Za-z0-9-]{1,40}):(?<date>\\d{4}-\\d{2}-\\d{2}):(?<hours>\\d{2})(?<minutes>\\d{2}):` +
    `(?<length>\\d{1,4})(?::s=(?<seat>${LABEL}))?(?::e=(?<equipment>${LABEL}))?(?<wait>:wait)?$`,
  'u',
);

// What a book card's key says; null for any other key.
export function bookKeyOf(key: string): BookKey | null {
  const groups = BOOK_KEY.exec(key)?.groups;
  if (groups === undefined) {
    return null;
  }
  return {
    spaceId: groups.spaceId ?? '',
    date: groups.date ?? '',
    start: `${groups.hours ?? ''}:${groups.minutes ?? ''}`,
    minutes: Number(groups.length),
    seat: groups.seat ?? null,
    equipment: groups.equipment ?? null,
    waitsForWindow: groups.wait !== undefined,
  };
}

// The site books a room from today to 3 days later (DAY_TO 3, the main server's `booking_ahead_days`). The
// room-window Notification comes at 09:00 on the day the window opens.
const ROOM_AHEAD_DAYS = 3;
const WINDOW_OPENS_AT = '09:00';

// Whether the site books a room on `date` now, by the day in Korea.
export function inRoomWindow(date: string, now: Date): boolean {
  return date <= dayAfter(koreaDateKey(now), ROOM_AHEAD_DAYS);
}

// A card whose key waits for the window while the window does not hold its date yet. Once it does, the card books as
// any room card.
export function isWaitingCard({ key }: Pick<LibraryCardData, 'key'>, now: Date): boolean {
  const parsed = bookKeyOf(key);
  return parsed !== null && parsed.waitsForWindow && !inRoomWindow(parsed.date, now);
}

// "11월 6일 09:00 예약 창이 열리면 예약할 수 있어요".
export function windowWords(date: string): string {
  const [, month = '', day = ''] = dayAfter(date, -ROOM_AHEAD_DAYS).split('-');
  return `${String(Number(month))}월 ${String(Number(day))}일 ${WINDOW_OPENS_AT} 예약 창이 열리면 예약할 수 있어요`;
}
