/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { koreaTime } from './korea-time.js';

const clock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// The minute of the day in Korea at `now`.
function minuteOfDay(now: Date): number {
  const [hours = 0, minutes = 0] = koreaTime(now).slice(11, 16).split(':').map(Number);
  return hours * 60 + minutes;
}

// "7시" said with no word for the half of the day, at its nearest occurrence from now, this minute included: "07:00"
// today, or "내일 07:00". At 08:00 7시 is 19:00, and 12시 at 13:00 is midnight.
export function nearestBareHour(hour: number, minute: number, now: Date): string {
  const morning = (hour % 12) * 60 + minute;
  const nowMinute = minuteOfDay(now);
  const today = [morning, morning + 12 * 60].find((time) => time >= nowMinute);
  return today === undefined ? `내일 ${clock(morning)}` : clock(today);
}

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);

// The rule for an hour said bare, with what each one means now, sent with the time of the request to every answer kind.
export function bareHourRule(now: Date): string {
  const readings = HOURS.map((hour) => `${hour}시 ${nearestBareHour(hour, 0, now)}`).join(', ');
  const hourNow = Math.floor(minuteOfDay(now) / 60) % 12 || 12;
  return `Bare hours: an hour said with no word for the half of the day (오전, 오후, 아침, 점심, 저녁, 밤, 새벽) and not in 24 hours is its nearest time from now, this minute included, today or else tomorrow: at 01:10 7시 is 07:00 today, at 08:00 19:00 today, at 20:00 07:00 tomorrow. Now that is ${readings}. With minutes, the same: ${hourNow}시 반 ${nearestBareHour(hourNow, 30, now)}. A word for the half of the day in the User's words wins (저녁 7시 is 19:00, 점심 12시 12:00, 아침 7시 07:00, 밤 11시 23:00), and so does a 24-hour time (19시, 07:00). It does not read an hour on another day the User named (내일 7시), or one that names an item of their day (1시 수업 is that Class). In a span (3시부터 6시까지, 12시에서 1시 사이) it reads the first hour, and the second is the first time after it.`;
}
