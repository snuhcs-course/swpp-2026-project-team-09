/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { cleanLogFolder, printReport } from './shuttle/read-log-files.ts';
import { scoreLeaveOneDayOut } from './shuttle/score.ts';
import { waitCells, waitReport } from './shuttle/timing.ts';

// `pnpm shuttle:score <folder>`: the shuttle metric over the logged days in the folder, leaving each day out in turn,
// after all that the cleaning rules left out. See README.md, "Shuttle".

function seconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

function percent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

function main([folder]: string[]): number {
  if (folder === undefined) {
    console.error('Usage: pnpm shuttle:score <folder>');
    return 1;
  }
  const days = cleanLogFolder(folder);
  if (days.length === 0) {
    console.error(`No logged day in ${folder}`);
    return 1;
  }
  for (const day of days) {
    printReport(`${day.date}, not scored`, waitReport(waitCells([day])));
  }
  const { ride, wait, holds } = scoreLeaveOneDayOut(days);
  console.log(`Folds: ${days.length}`);
  console.log(`Ride, ${ride.samples} held-out rides:`);
  console.log(`  MAE ${seconds(ride.mae)}, baseline ${seconds(ride.baselineMae)}`);
  console.log(`  within ±1 minute ${percent(ride.withinOneMinute)}, baseline ${percent(ride.baselineWithinOneMinute)}`);
  console.log(`Wait, ${wait.stopBands} scored stop-bands:`);
  console.log(`  MAE ${seconds(wait.mae)}, baseline ${seconds(wait.baselineMae)}`);
  console.log(`Threshold: ${holds ? 'holds' : 'does not hold'}`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
