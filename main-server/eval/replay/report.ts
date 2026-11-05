/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Where the replay's commands write: eval/results/replay-<name>-<time>.json and the Markdown beside it, as .md.
// eval/results/ is ignored by git, as the benchmark's runs are.

const RESULTS = new URL('../results/', import.meta.url);

export function table(header: string[], rows: string[][]): string {
  return [header, header.map(() => '---'), ...rows].map((row) => `| ${row.join(' | ')} |`).join('\n');
}

// Writes both files and answers their paths.
export function saveReport(name: string, json: unknown, markdown: string, at: Date): string[] {
  mkdirSync(RESULTS, { recursive: true });
  const stamp = at
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d+Z$/u, 'Z');
  const jsonFile = fileURLToPath(new URL(`replay-${name}-${stamp}.json`, RESULTS));
  const markdownFile = fileURLToPath(new URL(`replay-${name}-${stamp}.md`, RESULTS));
  writeFileSync(jsonFile, `${JSON.stringify(json, null, 2)}\n`);
  writeFileSync(markdownFile, `${markdown}\n`);
  return [jsonFile, markdownFile];
}
