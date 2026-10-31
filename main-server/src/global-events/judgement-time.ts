/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Reads the times of a Judgement, and what a quoted line of a post writes, so that the two can be compared. It does not
// read a line for the model: anything it cannot read fails a check, and the session stays a Draft.

const WEEKDAYS = '일월화수목금토';

// A time the model gave, in Korea.
export interface JudgedTime {
  at: Date;
  year: number;
  month: number;
  day: number;
  // Empty for a day alone.
  clock: { hour: number; minute: number } | null;
  weekday: string;
}

const TIME = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::00)?(?:\+09:00)?)?$/u;

function padded(part: number): string {
  return String(part).padStart(2, '0');
}

export function readJudgedTime(value: string): JudgedTime | null {
  const match = TIME.exec(value.trim());
  if (match === null) {
    return null;
  }
  const [year, month, day, hour, minute] = match.slice(1).map((part) => (part === undefined ? null : Number(part)));
  if (year === null || month === null || day === null) {
    return null;
  }
  const clock = hour === null || minute === null ? null : { hour, minute };
  const at = new Date(
    `${year}-${padded(month)}-${padded(day)}T${padded(clock?.hour ?? 0)}:${padded(clock?.minute ?? 0)}:00+09:00`,
  );
  // The calendar has no 02-30, and a clock no 25:00.
  const inKorea = new Date(at.getTime() + 9 * 60 * 60 * 1000);
  if (Number.isNaN(at.getTime()) || inKorea.getUTCMonth() + 1 !== month || inKorea.getUTCDate() !== day) {
    return null;
  }
  return { at, year, month, day, clock, weekday: WEEKDAYS[inKorea.getUTCDay()] ?? '' };
}

// A day a line writes: "2026. 10. 13.(화)", "2026-10-13", "10월 13일 화요일", "10월 13일 화", "10/13(화)", "26.10.13".
export interface WrittenDay {
  year: number | null;
  month: number;
  day: number;
  weekday: string | null;
}

const DAY = new RegExp(
  String.raw`(?<![\d.:-])(?:(\d{4}|\d{2})\s*[년./-]\s*)?(\d{1,2})\s*[월./-]\s*(\d{1,2})(?![\d:])\s*일?\s*\.?` +
    String.raw`(?:\s*[(（]\s*([${WEEKDAYS}])(?:요일)?\s*[)）]|\s*([${WEEKDAYS}])요일|\s*([${WEEKDAYS}])(?![\p{L}\p{N}]))?`,
  'gu',
);

export function writtenDays(line: string): WrittenDay[] {
  return [...line.matchAll(DAY)].map(({ 1: year, 2: month, 3: day, 4: inBrackets, 5: named, 6: alone }) => ({
    year: year === undefined ? null : Number(year.length === 2 ? `20${year}` : year),
    month: Number(month),
    day: Number(day),
    weekday: inBrackets ?? named ?? alone ?? null,
  }));
}

// Whether `written` is the day of `time`. A day written without a year is the one nearest to `now`: the model is given
// today's date to choose its year, and a year it chose otherwise is not what the post says.
export function isWrittenDay({ year, month, day }: WrittenDay, time: JudgedTime, now: Date): boolean {
  if (month !== time.month || day !== time.day) {
    return false;
  }
  if (year !== null) {
    return year === time.year;
  }
  const distance = (candidate: number): number =>
    Math.abs(new Date(Date.UTC(candidate, month - 1, day)).getTime() - now.getTime());
  const nearest = [time.year - 1, time.year, time.year + 1].toSorted((a, b) => distance(a) - distance(b))[0];
  return nearest === time.year;
}

// A clock a line writes: "14:00", "오후 2시 30분", "2시 반", "2:00 PM". A line's hour of 1 to 12 without 오전 or 오후, which
// a later time may also leave to an earlier one in "오후 2시~4시", is read as the daytime hours it can be.
const CLOCK =
  /(오전|오후|낮|저녁|밤|새벽|AM|PM)?\s*(?<![\d:.])(\d{1,2})(?:\s*:\s*(\d{2})(?::\d{2})?|\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?)(?!\d)\s*(AM|PM)?/giu;

const EARLIEST_DAYTIME_HOUR = 7;
const LATEST_DAYTIME_HOUR = 21;

function hoursOf(written: string, meridiem: string | undefined): number[] {
  const hour = Number(written);
  if (hour > 23) {
    return [];
  }
  if (meridiem !== undefined) {
    if (hour > 12) {
      return [];
    }
    const afternoon = /오후|낮|저녁|밤|PM/iu.test(meridiem);
    return [afternoon ? (hour % 12) + 12 : hour % 12];
  }
  if (hour === 0 || hour > 12 || written.startsWith('0')) {
    return [hour];
  }
  return [hour, hour === 12 ? hour : hour + 12].filter(
    (candidate) => candidate >= EARLIEST_DAYTIME_HOUR && candidate <= LATEST_DAYTIME_HOUR,
  );
}

export function isWrittenClock(line: string, { hour, minute }: { hour: number; minute: number }): boolean {
  if (hour === 12 && minute === 0 && line.includes('정오')) {
    return true;
  }
  return [...line.matchAll(CLOCK)].some(({ 1: before, 2: written, 3: colon, 4: minutes, 5: half, 6: after }) => {
    const writtenMinute = half === undefined ? Number(colon ?? minutes ?? 0) : 30;
    return writtenMinute === minute && hoursOf(written ?? '', before ?? after).includes(hour);
  });
}
