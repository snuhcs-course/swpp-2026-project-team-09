/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { existsSync, readFileSync } from 'node:fs';
import { type CleanedDay, cleanDay } from '../scripts/shuttle/departures.ts';
import { type LogFile, loadDays, type ReportLine } from '../scripts/shuttle/sets.ts';

const FOLDER = new URL('fixtures/shuttle/', import.meta.url);

// A log of test/fixtures/shuttle, with its set log if it has one.
export function logFile(name: string): LogFile {
  const setLog = new URL(`${name}.sets.csv`, FOLDER);
  return {
    csv: readFileSync(new URL(`${name}.csv`, FOLDER), 'utf8'),
    setLog: existsSync(setLog) ? readFileSync(setLog, 'utf8') : 'received_at,cars\n',
  };
}

export function cleanedLog(log: LogFile): { day: CleanedDay; report: ReportLine[] } {
  const { days, report } = loadDays([log]);
  const [day] = days;
  if (day === undefined) {
    throw new Error('The log holds no day');
  }
  const cleanedDay = cleanDay(day);
  return { day: cleanedDay, report: [...report, ...cleanedDay.report] };
}

export function cleaned(name: string): { day: CleanedDay; report: ReportLine[] } {
  return cleanedLog(logFile(name));
}

// The reasons a fixture's report gives, each once.
export function reasons(report: ReportLine[]): string[] {
  return [...new Set(report.map(({ rule, reason }) => `${rule} ${reason}`))].toSorted();
}
