/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { type CleanedDay, cleanDay } from './departures.ts';
import { loadDays, type LogFile, type ReportLine } from './sets.ts';

// A day's CSV, `YYYY-MM-DD.csv`, plain or gzipped. Its set log is `YYYY-MM-DD.sets.csv` beside it, in the same form. A
// day without one stops the tools, since an empty set would then read as an outage.
const LOG_DAY = /^(\d{4}-\d{2}-\d{2})\.csv(\.gz)?$/u;

function readText(path: string): string {
  const bytes = readFileSync(path);
  return (path.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString();
}

export function readLogFiles(folder: string): LogFile[] {
  return readdirSync(folder)
    .toSorted()
    .flatMap((name) => {
      const match = LOG_DAY.exec(name);
      if (match === null) {
        return [];
      }
      const setLog = `${match[1] ?? ''}.sets.csv${match[2] ?? ''}`;
      return [{ csv: readText(join(folder, name)), setLog: readText(join(folder, setLog)) }];
    });
}

export function printReport(heading: string, report: ReportLine[]): void {
  console.log(`${heading}: ${report.length} reported`);
  for (const { rule, reason, detail } of report) {
    console.log(`  ${rule} ${reason}: ${detail}`);
  }
}

// What both tools start from: the folder's days under the cleaning rules, with all that was left out printed. No day at
// all, which it says, ends the command.
export function cleanLogFolder(folder: string | undefined, command: string): CleanedDay[] {
  if (folder === undefined) {
    console.error(`Usage: pnpm ${command} <folder>`);
    return [];
  }
  const { days, report } = loadDays(readLogFiles(folder));
  if (days.length === 0) {
    console.error(`No logged day in ${folder}`);
  }
  printReport('The log files', report);
  return days.map((day) => {
    const cleaned = cleanDay(day);
    printReport(cleaned.date, cleaned.report);
    return cleaned;
  });
}
