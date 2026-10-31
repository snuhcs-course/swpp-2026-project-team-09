/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { shuttleTimingSchema } from '../src/shuttle/shuttle-timing.ts';
import { cleanLogFolder } from './shuttle/read-log-files.ts';
import { deriveTiming } from './shuttle/timing.ts';

// `pnpm shuttle:derive <folder>`: turns the logged days in the folder into seed/shuttle-timing.json, and prints all
// that the cleaning rules left out. See README.md, "Shuttle times from the Dev log".

const TIMING_FILE = fileURLToPath(new URL('../seed/shuttle-timing.json', import.meta.url));

async function main([folder]: string[]): Promise<number> {
  const days = cleanLogFolder(folder, 'shuttle:derive');
  if (days.length === 0) {
    return 1;
  }
  const timing = shuttleTimingSchema.parse(deriveTiming(days));
  const options = await resolveConfig(TIMING_FILE);
  await writeFile(TIMING_FILE, await format(JSON.stringify(timing, null, 2), { ...options, filepath: TIMING_FILE }));
  console.log(`Wrote ${TIMING_FILE} from ${timing.days.join(', ')}`);
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
