/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Asia/Seoul keeps +09:00 all year.
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The clock in Korea at `at`, read with the UTC getters.
function koreaClock(at: Date): Date {
  return new Date(at.getTime() + KOREA_OFFSET_MS);
}

// The date, the weekday and the time of day in Korea, as the model reads them: "2027-01-04 Monday 09:05".
export function koreaNow(at: Date): string {
  const clock = koreaClock(at);
  const [date, time] = clock.toISOString().split('T');
  return `${date} ${WEEKDAYS[clock.getUTCDay()]} ${time?.slice(0, 5)}`;
}

// A time in Korea with its offset: "2026-10-31T21:00:00+09:00".
export function koreaTime(at: Date): string {
  return `${koreaClock(at).toISOString().slice(0, 19)}+09:00`;
}

// The calendar day in Korea at `at`: "2027-01-04".
export function koreaDate(at: Date): string {
  return koreaClock(at).toISOString().slice(0, 10);
}

const WEEKDAY_WORDS = ['일', '월', '화', '수', '목', '금', '토'];

const DAY_MS = 24 * 60 * 60 * 1000;

const NEAR_DAYS: Partial<Record<number, string>> = { [-1]: '어제', 1: '내일', 2: '모레' };

// The day asked on. The plans round now up to the next minute, so a question at 23:59:30 comes as 00:00 the next day:
// the moment before it is still the day the User asked on.
const askedOn = (now: Date): string => koreaDate(new Date(now.getTime() - 1));

// The day of a time beside its clock, in the words the app writes (koreaDayWord in mobile/src/korea-time.ts): nothing
// for today, "내일(수)", "모레(목)", "어제(월)", else "11/23(월)".
export function dayWordsFrom(date: string, now: Date): string {
  const days = daysBetween(askedOn(now), date);
  if (days === 0) {
    return '';
  }
  const near = NEAR_DAYS[days];
  return near === undefined ? shortDate(date) : `${near}(${weekdayOf(date)})`;
}

// The calendar days from one day in Korea to another: "2026-11-17" to "2026-11-18" is 1.
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

const weekdayOf = (date: string): string => WEEKDAY_WORDS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? '';

// "11/28(금)", with no year.
function shortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${String(month)}/${String(day)}(${weekdayOf(date)})`;
}

// "14:00" in Korea.
const clockIn = (at: Date): string => koreaClock(at).toISOString().slice(11, 16);

// A time in Korea with its date, as a Notification says it: "11/28(금) 14:00", with no year (P06 ticket 26). Always the
// date, never "오늘" or "내일": a Notification's words are kept as they were made, and read on a later day.
export function dateAndClock(at: Date): string {
  return `${shortDate(koreaDate(at))} ${clockIn(at)}`;
}

// A time in Korea with its day before it when that is not today: "18:00", "내일(수) 18:00", "11/24(화) 09:00". A time
// with no day reads as today's, and a 파티 tomorrow read as today's was gone to a day early.
export function clockWithDay(at: Date, now: Date): string {
  const clock = clockIn(at);
  const day = dayWordsFrom(koreaDate(at), now);
  return day === '' ? clock : `${day} ${clock}`;
}
