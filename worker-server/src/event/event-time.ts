/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// When an event takes place, as one line of a post writes it. A bound is a time with its offset,
// 2026-10-13T17:00:00+09:00, or a day, 2026-10-13, when the line gives no time of day.
export interface EventTime {
  start: string;
  end: string | null;
}

interface Bound {
  // YYYY-MM-DD
  day: string;
  // HH:mm
  time: string | null;
}

// A day and the weekday the posts add: "2026. 10. 13.(화)", "2026.10.16(금)", "2026년 10월 7일(수요일)". The end of a
// range may leave out the year: "~ 10. 16.(금)". A half of the day in the brackets belongs to the time: "(오후) 3:00".
const HALF_WORD = String.raw`오전|오후|저녁|밤|낮`;
const HALF_LETTERS = String.raw`[AaPp]\.?\s*[Mm]\.?(?![A-Za-z])`;
const DAY = String.raw`(\d{1,2})\s*[.월/]\s*(\d{1,2})\s*[.일]?(?:\s*\((?!${HALF_WORD}|${HALF_LETTERS})[^)]{1,4}\))?`;
const START_DAY = new RegExp(String.raw`(\d{4})\s*[.년]\s*${DAY}`, 'u');
// A time and what may say which half of the day it is in, before or after it: "17:00", "오후 2시", "(오후) 3:00",
// "저녁 7시 30분", "PM 2:00", "5:00 PM", but not "3시간".
const TIME = String.raw`(?:(${HALF_WORD}|(?<![A-Za-z])${HALF_LETTERS})[\s)]*)?(\d{1,2})\s*(?::\s*(\d{2})|시(?!간)(?:\s*(\d{1,2})\s*분)?)(?:\s*(${HALF_LETTERS}))?`;
const RANGE = /[~∼〜～\-–]/u;
// What follows the range mark: a day, with or without the year, and a time, each of them optional.
const END = new RegExp(String.raw`^\s*(?:(?:(\d{4})\s*[.년]\s*)?${DAY})?\s*(?:${TIME})?`, 'u');

function asDay(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : null;
}

// The half of the day TIME captured, as its word or as "a" or "p".
function halfOf([before, , , , after]: (string | undefined)[]): string | undefined {
  const said = before ?? after;
  return said === undefined || /^[가-힣]/u.test(said) ? said : said[0].toLowerCase();
}

// The time of day from what TIME captures, or null when it is not clear whether it is before or after noon.
function asTime([, hour = '', colonMinutes, minutes]: (string | undefined)[], half: string | undefined): string | null {
  const beforeNoon = half === '오전' || half === 'a';
  let hours = Number(hour);
  if (hours > 12) {
    if (beforeNoon) {
      return null;
    }
  } else if (half === undefined) {
    // Without it only two digits before a colon are the 24-hour clock: "09:30", but not "2시" or "2:00".
    if (colonMinutes === undefined || hour.length < 2) {
      return null;
    }
  } else if (half === '밤' || half === '낮' || hours < 1) {
    // 밤 and 낮 each run over both halves of the day: 밤 9시 is 21:00, and 밤 1시 01:00.
    return null;
  } else if (hours === 12) {
    // Of 12 with a half of the day, only 오후 12시 or 12:00 PM is surely noon.
    if (half !== '오후' && half !== 'p') {
      return null;
    }
  } else if (!beforeNoon) {
    hours += 12;
  }
  const minutesPast = Number(colonMinutes ?? minutes ?? 0);
  return hours < 24 && minutesPast < 60
    ? `${String(hours).padStart(2, '0')}:${String(minutesPast).padStart(2, '0')}`
    : null;
}

function asText({ day, time }: Bound): string {
  return time === null ? day : `${day}T${time}:00+09:00`;
}

// The end after the range mark, in the start's form: a time when the start has one, a day otherwise. A day without the
// year is in the start's year, or in the next when it would come before the start.
function readEnd(text: string, start: Bound, halfOfStart: string | undefined): Bound | null {
  const [, year, month, dayOfMonth, ...time] = END.exec(text) ?? [];
  let day: string | null = start.day;
  if (month !== undefined) {
    const startYear = Number(start.day.slice(0, 4));
    day = asDay(Number(year ?? startYear), Number(month), Number(dayOfMonth));
    if (year === undefined && day !== null && day < start.day) {
      day = asDay(startYear + 1, Number(month), Number(dayOfMonth));
    }
  }
  if (day === null) {
    return null;
  }
  if (start.time === null) {
    return day > start.day ? { day, time: null } : null;
  }
  const [, hour] = time;
  if (hour === undefined) {
    return null;
  }
  // On the start's day, an end that names no half of the day is in the start's, "오후 1시 30분 ~ 3시 30분", unless it
  // then comes before the start: "오전 10시 ~ 14:00".
  const own = halfOf(time);
  for (const half of new Set([own ?? (month === undefined ? halfOfStart : undefined), own])) {
    const end = { day, time: asTime(time, half) };
    if (end.time !== null && asText(end) > asText(start)) {
      return end;
    }
  }
  return null;
}

// The start and end a line gives, or null when it names no day with its year.
export function readEventTime(text: string): EventTime | null {
  const first = START_DAY.exec(text);
  const day = first === null ? null : asDay(Number(first[1]), Number(first[2]), Number(first[3]));
  if (first === null || day === null) {
    return null;
  }
  const rest = text.slice(first.index + first[0].length);
  const range = RANGE.exec(rest);
  const time = new RegExp(TIME, 'u').exec(range === null ? rest : rest.slice(0, range.index))?.slice(1);
  const half = time === undefined ? undefined : halfOf(time);
  const start = { day, time: time === undefined ? null : asTime(time, half) };
  const end = range === null ? null : readEnd(rest.slice(range.index + 1), start, half);
  return { start: asText(start), end: end === null ? null : asText(end) };
}
