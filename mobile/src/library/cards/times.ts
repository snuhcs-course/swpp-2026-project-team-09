/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { koreaDateKey, koreaMinutes, WEEKDAYS } from '@/korea-time';

// The times of the library cards: the card's "YYYY-MM-DD" and "HH:MM", the site's YYYYMMDD and HHMM-HHMM, and the
// words a card shows. Every booking steps by 30 minutes.

export const STEP_MINUTES = 30;

const DAY_MS = 86_400_000;

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

// "17:00" as 1020.
export function minutesOf(clock: string): number {
  const [hours = '0', minutes = '0'] = clock.split(':');
  return Number(hours) * 60 + Number(minutes);
}

// 1020 as "17:00".
export function clockOf(minutes: number): string {
  return `${twoDigits(Math.floor(minutes / 60))}:${twoDigits(minutes % 60)}`;
}

// "2026-11-02" as the site's "20261102".
export function siteDate(date: string): string {
  return date.replaceAll('-', '');
}

// "17:00" for 60 minutes as the site's "1700-1800".
export function siteBookTime(start: string, minutes: number): string {
  return `${start.replace(':', '')}-${clockOf(minutesOf(start) + minutes).replace(':', '')}`;
}

// "17:00–18:00".
export function rangeWords(start: string, minutes: number): string {
  return `${start}–${clockOf(minutesOf(start) + minutes)}`;
}

// The day `days` after "2026-11-02", as "YYYY-MM-DD".
export function dayAfter(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// "오늘", "내일", or "11월 4일 (수)", by the phone's clock in Korea.
export function dayWords(date: string, now: Date): string {
  const today = koreaDateKey(now);
  if (date === today) {
    return '오늘';
  }
  if (date === dayAfter(today, 1)) {
    return '내일';
  }
  const day = new Date(`${date}T00:00:00Z`);
  return `${String(day.getUTCMonth() + 1)}월 ${String(day.getUTCDate())}일 (${WEEKDAYS[day.getUTCDay()] ?? ''})`;
}

// "오늘 17:00–18:00".
export function whenWords(date: string, start: string, minutes: number, now: Date): string {
  return `${dayWords(date, now)} ${rangeWords(start, minutes)}`;
}

// The next 30-minute start from now in Korea: 16:40 gives "17:00", 17:00 gives "17:00".
export function nextStart(now: Date): string {
  return clockOf(Math.ceil(koreaMinutes(now) / STEP_MINUTES) * STEP_MINUTES);
}

// The site's "2026-11-02 17:30:00" as its day and its clock.
export function siteInstant(text: string): { date: string; clock: string } {
  return { date: text.slice(0, 10), clock: text.slice(11, 16) };
}
