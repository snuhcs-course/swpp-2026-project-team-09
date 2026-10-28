/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Weekday } from '../../generated/prisma/client.js';
import { koreaDate } from '../korea-time.js';

// Times of day in Korea, as timetables hold them, against a moment of the server's clock.

const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

const WEEKDAYS: readonly Weekday[] = [
  Weekday.sunday,
  Weekday.monday,
  Weekday.tuesday,
  Weekday.wednesday,
  Weekday.thursday,
  Weekday.friday,
  Weekday.saturday,
];

// When the day in Korea that holds `at` began.
export function koreaMidnight(at: Date): Date {
  return new Date(`${koreaDate(at)}T00:00:00+09:00`);
}

// The minutes since midnight in Korea, with their fraction.
export function koreaMinutes(at: Date): number {
  return (at.getTime() - koreaMidnight(at).getTime()) / MINUTE_MS;
}

export function koreaWeekday(at: Date): Weekday {
  return WEEKDAYS[new Date(koreaDate(at)).getUTCDay()] ?? Weekday.monday;
}

// `HH:MM` as minutes since midnight.
export function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Minutes since midnight as `HH:MM`.
export function clockOf(minutes: number): string {
  const whole = Math.floor(minutes) % DAY_MINUTES;
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

// The moment `minutes` after midnight, `days` days after the day in Korea that holds `at`.
export function koreaAt(at: Date, minutes: number, days = 0): Date {
  return new Date(koreaMidnight(at).getTime() + (days * DAY_MINUTES + minutes) * MINUTE_MS);
}

// "3월 4일 18:30", as a reason line shows a time.
export function koreaShort(at: Date): string {
  const [, month = '', day = ''] = koreaDate(at).split('-');
  return `${Number(month)}월 ${Number(day)}일 ${clockOf(koreaMinutes(at))}`;
}
