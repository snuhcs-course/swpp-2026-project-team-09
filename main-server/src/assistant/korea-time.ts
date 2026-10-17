/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
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
