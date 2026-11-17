/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// P15-52: what a timetable's labels say, as code reads them from what the model read: a day label's weekday, an hour
// label's hour, and a time on the axis's own clock as 24-hour minutes. No app's layout is assumed: days in Korean or
// English, hours on a 12- or 24-hour clock, with or without 오전/오후, from any first hour.

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const DAY_LETTERS: Readonly<Record<string, Weekday>> = {
  월: 'monday',
  화: 'tuesday',
  수: 'wednesday',
  목: 'thursday',
  금: 'friday',
  토: 'saturday',
  일: 'sunday',
};
export const LETTERS: Readonly<Record<Weekday, string>> = {
  monday: '월',
  tuesday: '화',
  wednesday: '수',
  thursday: '목',
  friday: '금',
  saturday: '토',
  sunday: '일',
};
const ENGLISH_DAYS: readonly [RegExp, Weekday][] = [
  [/^mon/iu, 'monday'],
  [/^tue/iu, 'tuesday'],
  [/^wed/iu, 'wednesday'],
  [/^thu/iu, 'thursday'],
  [/^fri/iu, 'friday'],
  [/^sat/iu, 'saturday'],
  [/^sun/iu, 'sunday'],
];

// The day a label names: 월, 월요일, (월), Mon, MON, Monday, Thurs. Null for any other.
export function dayOf(label: string): Weekday | null {
  const text = label.normalize('NFC').replaceAll(/[\s()[\]]/gu, '');
  const korean = /^([월화수목금토일])(?:요일)?$/u.exec(text)?.[1];
  if (korean !== undefined) {
    return DAY_LETTERS[korean] ?? null;
  }
  return ENGLISH_DAYS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

// A name or a line as compared: Unicode NFC, spaces collapsed and trimmed.
export function tidy(text: string): string {
  return text.normalize('NFC').replaceAll(/\s+/gu, ' ').trim();
}

// One hour label: its number as printed, and its 24-hour hour when it carries a morning or afternoon mark (오전 9시,
// 오후 1시, 9 AM, 1 PM), else null. `9`, `09`, `9:00`, `9시` carry none. Null for a label that is no hour.
export function labelOf(label: string): { printed: number; marked: number | null } | null {
  const text = label.normalize('NFC').trim();
  const match = /^(오전|오후|am|pm)?\s*(\d{1,2})(?::00)?\s*(?:시)?\s*(am|pm|a\.m\.|p\.m\.)?$/iu.exec(text);
  if (match === null) {
    return null;
  }
  const printed = Number(match[2]);
  const mark = (match[1] ?? match[3] ?? '').toLowerCase().replaceAll('.', '');
  if (printed > 24 || (mark !== '' && printed > 12)) {
    return null;
  }
  const afternoon = mark === '오후' || mark === 'pm';
  const marked = mark === '' ? null : (printed % 12) + (afternoon ? 12 : 0);
  return { printed, marked };
}

// The axis's labels as 24-hour hours, or null when they are not a run of consecutive hours. A marked label is its own
// hour; on an unmarked 12-hour axis, the first label smaller than the one above it, and every label after it, gains
// 12 (… 11, 12, 1, 2 → … 11, 12, 13, 14).
export function axisHours(labels: readonly string[]): number[] | null {
  const read = labels.map((label) => labelOf(label));
  if (read.length < 2 || read.some((label) => label === null)) {
    return null;
  }
  const hours: number[] = [];
  let added = 0;
  for (const label of read) {
    const previous = hours.at(-1);
    const marked = label?.marked ?? null;
    if (marked !== null) {
      hours.push(marked);
      continue;
    }
    let hour = (label?.printed ?? 0) + added;
    if (previous !== undefined && hour <= previous && added === 0) {
      added = 12;
      hour += 12;
    }
    hours.push(hour);
  }
  const consecutive = hours.every((hour, index) => index === 0 || hour === (hours[index - 1] ?? 0) + 1);
  return consecutive && (hours.at(-1) ?? 25) <= 24 ? hours : null;
}

// A time read on the axis's clock, as the minutes after midnight it can be, on five minutes. Its hour is a label's
// 24-hour hour where it is printed so ("1" on a 12-hour axis is 13), or the 24-hour hour itself when that is on the
// axis ("13"); the hour after the last label counts, for a block that ends on the grid's bottom line. On a 12-hour axis
// that runs past 12 hours one printed hour can be two (9 and 21); none for a time that is not "H:MM" or off the axis.
export function minutesOf(time: string, labels: readonly string[], hours: readonly number[]): number[] {
  const match = /^\s*(\d{1,2}):(\d{2})\s*$/u.exec(time);
  if (match === null) {
    return [];
  }
  const [hourText = '', minuteText = ''] = match.slice(1);
  const [hourRead, minute] = [Number(hourText), Number(minuteText)];
  if (minute >= 60) {
    return [];
  }
  const printed = labels.map((label) => labelOf(label)?.printed ?? Number.NaN);
  const next = (hours.at(-1) ?? 0) + 1;
  const twelveHour = hours.some((hour, index) => hour !== printed[index]);
  const asPrinted = [...printed, twelveHour && next > 12 ? next - 12 : next];
  const as24 = [...hours, next];
  const found = as24.filter((hour, index) => asPrinted[index] === hourRead || hour === hourRead);
  return [...new Set(found)].map((hour) => Math.round((hour * 60 + minute) / 5) * 5);
}

// The start and end of a block from what each can be: the pair with the start before the end that is shortest.
export function blockTimes(starts: readonly number[], ends: readonly number[]): [number, number] | null {
  let best: [number, number] | null = null;
  for (const start of starts) {
    for (const end of ends) {
      if (end > start && (best === null || end - start < best[1] - best[0])) {
        best = [start, end];
      }
    }
  }
  return best;
}

export function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
