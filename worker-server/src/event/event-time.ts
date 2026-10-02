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
// range may leave out the year: "~ 10. 16.(금)".
const DAY = String.raw`(\d{1,2})\s*[.월/]\s*(\d{1,2})\s*[.일]?(?:\s*\([^)]{1,4}\))?`;
const START_DAY = new RegExp(String.raw`(\d{4})\s*[.년]\s*${DAY}`, 'u');
// A time and what may say whether it is before or after noon: "17:00", "오후 2시", "저녁 7시 30분", "5:00 PM", but not
// "3시간".
const TIME = String.raw`(오전|오후|저녁)?\s*(\d{1,2})\s*(?::\s*(\d{2})|시(?!간)(?:\s*(\d{1,2})\s*분)?)(?:\s*([AaPp])\.?\s*[Mm]\.?(?![A-Za-z]))?`;
const RANGE = /[~∼〜～\-–]/u;
// What follows the range mark: a day, with or without the year, and a time, each of them optional.
const END = new RegExp(String.raw`^\s*(?:(?:(\d{4})\s*[.년]\s*)?${DAY})?\s*(?:${TIME})?`, 'u');

function asDay(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : null;
}

// The time of day from what TIME captures, or null when it is not clear whether it is before or after noon.
function asTime([said, hour = '', colonMinutes, minutes, suffix]: (string | undefined)[]): string | null {
  const half = (said ?? suffix)?.toLowerCase();
  let hours = Number(hour);
  if (half === undefined) {
    // Without it only the 24-hour clock is clear: "14시", "19:30", "09:30", but not "2시" or "2:00".
    if (hours < 13 && (colonMinutes === undefined || hour.length < 2)) {
      return null;
    }
  } else if (hours === 12) {
    // Of 12 with a half of the day, only 오후 12시 or 12 PM is surely noon.
    if (half !== '오후' && half !== 'p') {
      return null;
    }
  } else if (hours < 1 || hours > 12) {
    return null;
  } else if (half !== '오전' && half !== 'a') {
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
function readEnd(text: string, start: Bound): Bound | null {
  const [, year, month, dayOfMonth, ...timeGroups] = END.exec(text) ?? [];
  const time = timeGroups[1] === undefined ? null : asTime(timeGroups);
  let day: string | null = start.day;
  if (month !== undefined) {
    const startYear = Number(start.day.slice(0, 4));
    day = asDay(Number(year ?? startYear), Number(month), Number(dayOfMonth));
    if (year === undefined && day !== null && day < start.day) {
      day = asDay(startYear + 1, Number(month), Number(dayOfMonth));
    }
  }
  if (day === null || (start.time !== null && time === null)) {
    return null;
  }
  const end = { day, time: start.time === null ? null : time };
  return asText(end) > asText(start) ? end : null;
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
  const startTime = new RegExp(TIME, 'u').exec(range === null ? rest : rest.slice(0, range.index));
  const start = { day, time: startTime === null ? null : asTime(startTime.slice(1)) };
  const end = range === null ? null : readEnd(rest.slice(range.index + 1), start);
  return { start: asText(start), end: end === null ? null : asText(end) };
}
