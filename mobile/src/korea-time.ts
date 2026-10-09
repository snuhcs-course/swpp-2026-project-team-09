// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-08, prompted by AhnJinYoung and fyoon46, reviewed by Jaehyun0320 in #51
// Times are shown in Korea's time wherever the phone is: the campus is there. Korea is nine hours ahead of UTC all
// year.
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

// A date whose UTC fields read as Korea's clock and calendar.
function inKorea(instant: Date): Date {
  return new Date(instant.getTime() + KOREA_OFFSET_MS);
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

// "14:00"
export function koreaClock(instant: string): string {
  const korea = inKorea(new Date(instant));
  return `${twoDigits(korea.getUTCHours())}:${twoDigits(korea.getUTCMinutes())}`;
}

// How many days of Korea's calendar `instant` is after `now`: 0 on the same day, 1 on the next, less than 0 before.
export function koreaDaysAfter(now: Date, instant: Date): number {
  return Math.floor(inKorea(instant).getTime() / DAY_MS) - Math.floor(inKorea(now).getTime() / DAY_MS);
}

// "10월 3일 (토)"
export function koreaDate(instant: Date): string {
  const korea = inKorea(instant);
  return `${korea.getUTCMonth() + 1}월 ${korea.getUTCDate()}일 (${WEEKDAYS[korea.getUTCDay()]})`;
}

// The next day of Korea's calendar, at the same time.
export function koreaNextDay(instant: Date): Date {
  return new Date(instant.getTime() + DAY_MS);
}

// "오늘", "내일", or "10월 3일 (토)".
export function koreaDay(instant: string, now: Date): string {
  const days = koreaDaysAfter(now, new Date(instant));
  if (days === 0) {
    return '오늘';
  }
  if (days === 1) {
    return '내일';
  }
  return koreaDate(new Date(instant));
}

// Whether two instants are on the same day of Korea's calendar.
export function sameKoreaDay(one: Date, other: Date): boolean {
  return Math.floor(inKorea(one).getTime() / DAY_MS) === Math.floor(inKorea(other).getTime() / DAY_MS);
}

// The day of the week in Korea: 0 for Sunday, 1 for Monday.
export function koreaWeekday(instant: Date): number {
  return inKorea(instant).getUTCDay();
}

// 2026
export function koreaYear(instant: Date): number {
  return inKorea(instant).getUTCFullYear();
}

// "2026-10-06": the day of Korea's calendar, as the main server takes a date.
export function koreaDateKey(instant: Date): string {
  return inKorea(instant).toISOString().slice(0, 10);
}

// The month, the day of the month and the weekday, 0 for Sunday, of Korea's calendar.
export function koreaCalendar(instant: Date): { month: number; date: number; weekday: number } {
  const korea = inKorea(instant);
  return { month: korea.getUTCMonth() + 1, date: korea.getUTCDate(), weekday: korea.getUTCDay() };
}

// The minutes since midnight of Korea's clock.
export function koreaMinutes(instant: Date): number {
  const korea = inKorea(instant);
  return korea.getUTCHours() * 60 + korea.getUTCMinutes();
}

// The instant at a time of Korea's clock on the day `daysAhead` days of Korea's calendar after `now`.
export function koreaInstant(now: Date, daysAhead: number, hour: number, minute: number): Date {
  const dayStart = Math.floor(inKorea(now).getTime() / DAY_MS) * DAY_MS - KOREA_OFFSET_MS;
  return new Date(dayStart + daysAhead * DAY_MS + (hour * 60 + minute) * 60_000);
}

// The hour and the minute of Korea's clock: [19, 30].
export function koreaHourMinute(instant: Date): [number, number] {
  const korea = inKorea(instant);
  return [korea.getUTCHours(), korea.getUTCMinutes()];
}

// The day of the month in Korea: 8.
export function koreaDayOfMonth(instant: Date): number {
  return inKorea(instant).getUTCDate();
}

// "일", "월", …: the day of the week's name in Korea.
export function koreaWeekdayName(instant: Date): string {
  return WEEKDAYS[koreaWeekday(instant)] ?? '';
}

// "10/03 (토)"
export function koreaShortDate(instant: Date): string {
  const korea = inKorea(instant);
  return `${twoDigits(korea.getUTCMonth() + 1)}/${twoDigits(korea.getUTCDate())} (${WEEKDAYS[korea.getUTCDay()]})`;
}
