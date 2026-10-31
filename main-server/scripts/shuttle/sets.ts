/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { koreaDate, koreaTime } from '../../src/assistant/korea-time.ts';
import { bandAt, SHUTTLE_STOP_COUNT, type ShuttleBand } from '../../src/shuttle/shuttle-timing.ts';

// The first two cleaning rules of the shuttle log (the P04 spec's R1 and R2): the CSV days as sets of vehicles.

// What the cleaning left out of a day, or a note on it, and why.
export interface ReportLine {
  rule: string;
  reason: string;
  detail: string;
}

// A log day as the collector writes it: the rows of the CSV and the set log beside it, with its header each.
export interface LogFile {
  csv: string;
  setLog: string;
}

export interface ShuttleSet {
  at: number;
  // Each car's stop, by `loop_order`.
  cars: Map<string, number>;
}

export interface ShuttleDay {
  date: string;
  // In time order. An empty set comes from the set log.
  sets: ShuttleSet[];
}

// The rules were designed on this day's 30-minute sample, so it never takes part.
const PILOT_DAY = '2026-10-29';

const OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/u;

export function clockTime(at: number): string {
  return koreaTime(new Date(at)).slice(11, 19);
}

export function bandOf(at: number): ShuttleBand | null {
  return bandAt(Number(clockTime(at).slice(0, 2)));
}

function readClock(value: string): number {
  const at = Date.parse(value);
  if (!OFFSET.test(value) || Number.isNaN(at)) {
    throw new Error(`R1: received_at has no offset: ${value}`);
  }
  if (clockTime(at) < '07:55:00' || clockTime(at) > '21:05:00') {
    throw new Error(`R1: a set outside 07:55–21:05 in Korea: ${value}`);
  }
  return at;
}

function dataLines(text: string): string[] {
  return text
    .split('\n')
    .slice(1)
    .filter((line) => line !== '');
}

interface Row {
  car: string;
  stop: number;
}

function readRow(line: string): (Row & { receivedAt: string }) | null {
  const [receivedAt, car, , , order, ...rest] = line.split(',');
  const stop = Number(order);
  const known = order !== undefined && order !== '' && Number.isInteger(stop) && stop >= 0 && stop < SHUTTLE_STOP_COUNT;
  return receivedAt && car && known && rest.length === 0 ? { receivedAt, car, stop } : null;
}

// A car at two stops is left out of the set. A car listed twice at one stop keeps its first row.
function carsOfSet(rows: Row[], receivedAt: string, report: ReportLine[]): Map<string, number> {
  const stops = new Map<string, Set<number>>();
  for (const { car, stop } of rows) {
    if (stops.get(car)?.has(stop) === true) {
      report.push({ rule: 'R2', reason: 'repeated row', detail: `${car} at ${receivedAt}` });
    }
    stops.set(car, (stops.get(car) ?? new Set<number>()).add(stop));
  }
  const cars = new Map<string, number>();
  for (const [car, listed] of stops) {
    const [stop, ...others] = listed;
    if (stop !== undefined && others.length === 0) {
      cars.set(car, stop);
    } else {
      report.push({ rule: 'R2', reason: 'car at two stops', detail: `${car} at ${receivedAt}` });
    }
  }
  return cars;
}

function rowsByReceivedAt(csv: string, report: ReportLine[]): Map<string, Row[]> {
  const rows = new Map<string, Row[]>();
  for (const line of dataLines(csv)) {
    const row = readRow(line);
    if (row === null) {
      report.push({ rule: 'R2', reason: 'garbled row', detail: line });
      continue;
    }
    const set = rows.get(row.receivedAt) ?? [];
    set.push(row);
    rows.set(row.receivedAt, set);
  }
  return rows;
}

// R1 and R2. Each date is cleaned on its own, whichever file holds its rows.
export function loadDays(logs: LogFile[]): { days: ShuttleDay[]; report: ReportLine[] } {
  const report: ReportLine[] = [];
  const sets = new Map<number, ShuttleSet>();
  for (const { csv, setLog } of logs) {
    const rows = [...rowsByReceivedAt(csv, report)].map(([text, list]) => ({ at: readClock(text), text, list }));
    for (const { at, text, list } of rows.toSorted((a, b) => a.at - b.at)) {
      if (sets.has(at)) {
        report.push({ rule: 'R2', reason: 'repeated set time', detail: text });
      } else {
        sets.set(at, { at, cars: carsOfSet(list, text, report) });
      }
    }
    for (const line of dataLines(setLog)) {
      const at = readClock(line.split(',')[0] ?? '');
      if (!sets.has(at)) {
        sets.set(at, { at, cars: new Map() });
      }
    }
  }
  const days = new Map<string, ShuttleSet[]>();
  for (const set of [...sets.values()].toSorted((a, b) => a.at - b.at)) {
    const date = koreaDate(new Date(set.at));
    if (date === PILOT_DAY) {
      throw new Error(`${PILOT_DAY} is the pilot sample, which the shuttle tools never read`);
    }
    const daySets = days.get(date) ?? [];
    daySets.push(set);
    days.set(date, daySets);
  }
  return { days: [...days].map(([date, daySets]) => ({ date, sets: daySets })), report };
}
