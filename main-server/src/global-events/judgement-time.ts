/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Reads the times of a Judgement, and what a quoted line of a post writes, so that the two can be compared. It does not
// read a line for the model: anything it cannot read fails a check, and the session stays a Draft.

const WEEKDAYS = '일월화수목금토';

const LAST_MINUTE_OF_DAY_MS = (23 * 60 + 59) * 60 * 1000;

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

export function isSameDay(one: JudgedTime, other: JudgedTime): boolean {
  return one.year === other.year && one.month === other.month && one.day === other.day;
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

// What may stand right before the hyphen of a range, so that "2026.11.05-2026.11.30" and "11/5 10:00-11/7" read two days
// and "301-1-2" reads none: a day with any weekday, or a clock.
const BEFORE_HYPHEN =
  String.raw`(?:(?<!\d)\d{1,2}\s*[월./-]\s*\d{1,2}\s*일?\s*\.?(?:\s*[(（]?[${WEEKDAYS}](?:요일)?[)）]?)?` +
  String.raw`|\d{1,2}:\d{2}|\d{1,2}\s*시(?:\s*\d{1,2}\s*분|\s*반)?)`;

// A year's mark goes on after the month, or the "11/5" of "11/5 - 11/30" would read as a day of the year 2011.
const YEAR_THEN = String.raw`(?:년|\.(?=\s*\d{1,2}\s*[.월])|/(?=\s*\d{1,2}\s*/)|-(?=\s*\d{1,2}\s*-))`;

const DAY = new RegExp(
  String.raw`(?<![\d.:])(?<!(?<!${BEFORE_HYPHEN})-)(?:(\d{4}|\d{2})\s*${YEAR_THEN}\s*)?(\d{1,2})\s*[월./-]\s*(\d{1,2})(?![\d:])\s*일?\s*\.?` +
    String.raw`(?:\s*[(（]\s*([${WEEKDAYS}])(?:요일)?\s*[)）]|\s*([${WEEKDAYS}])요일|\s*([${WEEKDAYS}])(?![\p{L}\p{N}]))?`,
  'gu',
);

// A list's number before a line's day: "1. 3월 9일" is the 9th of March, never the 3rd of January. A number before a day
// written with dots is that day's year or month: "11. 2.(월)", "3. 9. 2시", "26. 11. 2.".
const LIST_NUMBER = new RegExp(String.raw`^\d{1,2}\.\s+(?!\d{1,2}\s*\.\s*\d)(?=${DAY.source})`, 'u');

function withoutListNumber(line: string): string {
  return line.replace(LIST_NUMBER, '');
}

function dayOf({ 1: year, 2: month, 3: day, 4: inBrackets, 5: named, 6: alone }: RegExpExecArray): WrittenDay {
  return {
    year: year === undefined ? null : Number(year.length === 2 ? `20${year}` : year),
    month: Number(month),
    day: Number(day),
    weekday: inBrackets ?? named ?? alone ?? null,
  };
}

export function writtenDays(line: string): WrittenDay[] {
  return [...withoutListNumber(line).matchAll(DAY)].map((match) => dayOf(match));
}

const THEN_TO = /^[\s\d:시분반오전후()]*(?:[~∼〜–—-]|부터)\s*$/u;
const THEN_TO_DAY = /^[\s\d:시분반오전후()]*[~∼〜–—-]\s*(\d{1,2})일/u;

// The last days of the ranges a line writes across days: "11월 5일 ~ 11월 30일", "11/5 10:00 ~ 11/7 18:00", "11월 5일~30일",
// "2026.11.05-2026.11.30". The hyphen of "2026-11-05" is inside a day, and that of "10:00-18:00" between no days.
export function rangesEndIn(written: string): { month: number; day: number }[] {
  const line = withoutListNumber(written);
  const days = [...line.matchAll(DAY)];
  return days.flatMap((match, index) => {
    const after = match.index + match[0].length;
    const month = Number(match[2]);
    const day = Number(match[3]);
    const next = days[index + 1];
    const between = line.slice(after, next?.index ?? line.length);
    const sameMonth = THEN_TO_DAY.exec(between);
    if (sameMonth !== null) {
      return [{ month, day: Number(sameMonth[1]) }];
    }
    if (next === undefined || !THEN_TO.test(between)) {
      return [];
    }
    const last = { month: Number(next[2]), day: Number(next[3]) };
    return last.month === month && last.day === day ? [] : [last];
  });
}

// When a period is over, for what is stored as its end. A day alone, or the 00:00 extra.snu writes where it has no time,
// is the whole of that day: at its 00:00 the event would leave the lists a day early, and at the next day's 00:00 its card
// would name the next day.
export function periodEndAt({ at, clock }: JudgedTime): Date {
  const hasNoTime = clock === null || (clock.hour === 0 && clock.minute === 0);
  return hasNoTime ? new Date(at.getTime() + LAST_MINUTE_OF_DAY_MS) : at;
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
  /(오전|오후|낮|저녁|밤|새벽|AM|PM)?\s*(?<![\d:.])(\d{1,2})(?:\s*:\s*(\d{2})(?::\d{2})?|\s*시(?!간)(?:\s*(\d{1,2})\s*분|\s*(반))?)(?!\d)\s*(AM|PM)?/giu;

// The first hour of "오후 2–5시" is a clock of 오후 too, read as if written "오후 2시–5시".
const FIRST_OF_HOURS = /(오전|오후)\s*(?<![\d:.])(\d{1,2})\s*([–~-])\s*(?=\d{1,2}\s*시(?!간))/gu;

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

// A clock as written, with every hour it can be.
export interface WrittenClock {
  hours: number[];
  minute: number;
}

const RANGE_MARK = /^\s*(?:[~∼〜–—-]|부터)\s*$/u;

// The clocks a text writes in order, each with whether a range mark joins it to the one before.
function clocksIn(text: string): (WrittenClock & { endsRange: boolean })[] {
  const written = text.replaceAll(FIRST_OF_HOURS, '$1 $2시$3');
  let previousEnd: number | null = null;
  return [...written.matchAll(CLOCK)].map(
    ({ index, 0: whole, 1: before, 2: hour, 3: colon, 4: minutes, 5: half, 6: after }) => {
      const endsRange = previousEnd !== null && RANGE_MARK.test(written.slice(previousEnd, index));
      previousEnd = index + whole.length;
      return {
        hours: hoursOf(hour ?? '', before ?? after),
        minute: half === undefined ? Number(colon ?? minutes ?? 0) : 30,
        endsRange,
      };
    },
  );
}

export function isWrittenClock(line: string, { hour, minute }: { hour: number; minute: number }): boolean {
  if (hour === 12 && minute === 0 && line.includes('정오')) {
    return true;
  }
  return clocksIn(line).some((clock) => clock.minute === minute && clock.hours.includes(hour));
}

// A day a line writes with its start, and its end where the line writes a range.
export interface WrittenTime {
  day: WrittenDay;
  start: WrittenClock;
  end: WrittenClock | null;
}

// The times a day's part of a line writes: each clock starts one, and a clock a range mark joins to it ends it.
function timesOf(day: WrittenDay, clocks: (WrittenClock & { endsRange: boolean })[]): WrittenTime[] {
  const times: WrittenTime[] = [];
  for (const clock of clocks) {
    const last = times.at(-1);
    if (clock.endsRange && last !== undefined && last.end === null) {
      last.end = clock;
    } else {
      times.push({ day, start: clock, end: null });
    }
  }
  return times;
}

// The times a line writes after its days: "11월 5일 14:00~16:00", "11/5 10:00 ~ 11/7 18:00", "11/5 14:00~16:00,
// 17:00~18:00". A clock before a range mark that a day follows starts a range whose end is the next day's first clock. A
// clock with no day before it is not read.
export function writtenTimes(written: string): WrittenTime[] {
  const line = withoutListNumber(written);
  const days = [...line.matchAll(DAY)];
  const times: WrittenTime[] = [];
  let open: { day: WrittenDay; start: WrittenClock } | null = null;
  for (const [index, match] of days.entries()) {
    const next = days[index + 1];
    const between = line.slice(match.index + match[0].length, next?.index ?? line.length);
    const clocks = clocksIn(between);
    if (open !== null) {
      times.push({ ...open, end: clocks.shift() ?? null });
      open = null;
    }
    const [first] = clocks;
    if (first !== undefined && next !== undefined && clocks.length === 1 && THEN_TO.test(between)) {
      open = { day: dayOf(match), start: first };
    } else {
      times.push(...timesOf(dayOf(match), clocks));
    }
  }
  return times;
}
