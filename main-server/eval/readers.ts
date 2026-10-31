/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { koreaDate, koreaTime } from '../src/assistant/korea-time.ts';

// How a single value is read by the normalisers (eval/normalise.ts): dates, times, words and Boards in one form.

// The Boards by their Korean names too, as the party form and the tools' descriptions call them.
const BOARDS: Record<string, string> = {
  식사: 'meal',
  커리어: 'career',
  진로: 'career',
  취미: 'hobby',
  운동: 'hobby',
  공연: 'show',
  전시: 'show',
  '공연·전시': 'show',
};

export function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;
// A date and time with no offset, read as Korea's: 2026-10-22T19:00 or 2026-10-22 19:00.
const LOCAL_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/u;

function instantOf(text: string): Date | null {
  const local = LOCAL_TIME.exec(text);
  const at = new Date(local === null ? text : `${local[1]}T${local[2]}:00+09:00`);
  return Number.isNaN(at.getTime()) ? null : at;
}

// A calendar day in Korea; text that is no date stays as it is.
export function dayOf(input: unknown): unknown {
  if (typeof input !== 'string' || DATE_ONLY.test(input.trim())) {
    return typeof input === 'string' ? input.trim() : input;
  }
  const at = instantOf(input.trim());
  return at === null ? input : koreaDate(at);
}

// The day and HH:MM in Korea: "2026-10-22 19:00".
export function momentOf(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }
  const at = instantOf(input.trim());
  return at === null ? input : koreaTime(at).slice(0, 16).replace('T', ' ');
}

const CLOCK_TIME = /^(\d{2}:\d{2})(?::\d{2})?$/u;

// HH:MM in Korea, from a time of day or a date and time; other text stays as it is, such as `now` and `end`.
export function clockOf(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }
  const text = input.trim();
  const time = CLOCK_TIME.exec(text)?.[1];
  if (time !== undefined) {
    return time;
  }
  const at = instantOf(text);
  return at === null ? text : koreaTime(at).slice(11, 16);
}

export function windowOf(input: unknown): unknown {
  return isRecord(input) ? { from: clockOf(input.from), to: clockOf(input.to) } : input;
}

export function wordsOf(input: unknown): unknown {
  return typeof input === 'string' ? input.trim() : input;
}

export function boardOf(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }
  const name = input.trim().toLowerCase();
  return BOARDS[name] ?? name;
}
