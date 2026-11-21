/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-21  Opus 5.5   prompted by fyoon46
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

// A day in words, from now: 오늘, 내일, 모레, or "11월 24일 (월)".
export function dayWordsFrom(date: string, now: Date): string {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${koreaDate(now)}T00:00:00Z`)) / DAY_MS);
  const named = ['오늘', '내일', '모레'][days];
  if (named !== undefined) {
    return named;
  }
  const [, month, day] = date.split('-').map(Number);
  return `${month}월 ${day}일 (${WEEKDAY_WORDS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? ''})`;
}

// A time in Korea with its day when that is not today: "18:00", "내일 18:00", "11월 24일 (월) 12:21". A time with no
// day reads as today's, and a 파티 tomorrow read as today's was gone to a day early.
export function clockWithDay(at: Date, now: Date): string {
  const clock = koreaClock(at).toISOString().slice(11, 16);
  const date = koreaDate(at);
  return date === koreaDate(now) ? clock : `${dayWordsFrom(date, now)} ${clock}`;
}
