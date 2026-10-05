// Times are shown in Korea's time wherever the phone is: the campus is there. Korea is nine hours ahead of UTC all
// year.
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

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

// "오늘", "내일", or "10월 3일 (토)".
export function koreaDay(instant: string, now: Date): string {
  const korea = inKorea(new Date(instant));
  const days = Math.floor(korea.getTime() / DAY_MS) - Math.floor(inKorea(now).getTime() / DAY_MS);
  if (days === 0) {
    return '오늘';
  }
  if (days === 1) {
    return '내일';
  }
  return `${korea.getUTCMonth() + 1}월 ${korea.getUTCDate()}일 (${WEEKDAYS[korea.getUTCDay()]})`;
}

// Whether two instants are on the same day of Korea's calendar.
export function sameKoreaDay(one: Date, other: Date): boolean {
  return Math.floor(inKorea(one).getTime() / DAY_MS) === Math.floor(inKorea(other).getTime() / DAY_MS);
}

// 2026
export function koreaYear(instant: Date): number {
  return inKorea(instant).getUTCFullYear();
}
