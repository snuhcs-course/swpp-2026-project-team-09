/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { fallbackRideSeconds, fallbackWaitSeconds } from '../../src/shuttle/shuttle-timing.ts';
import { type CleanedDay } from './departures.ts';
import { deriveTiming, ridesOf, waitCells } from './timing.ts';

// The shuttle metric (the P04 spec's Evaluation plan 3): each day in turn is held out and compared with the times
// derived from the others.

const NEAR_SECONDS = 60;
// After 19:00 a day has too few headways.
const UNSCORED_WAIT_BAND = '19-21';

interface Comparison {
  actual: number;
  predicted: number;
  baseline: number;
}

export interface ShuttleScore {
  ride: {
    samples: number;
    mae: number;
    baselineMae: number;
    withinOneMinute: number;
    baselineWithinOneMinute: number;
  };
  wait: { stopBands: number; mae: number; baselineMae: number };
  // Each MAE below its baseline. With nothing to compare an MAE is NaN, which never holds.
  holds: boolean;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function maeOf(comparisons: Comparison[], against: 'predicted' | 'baseline'): number {
  return mean(comparisons.map((comparison) => Math.abs(comparison[against] - comparison.actual)));
}

function shareNear(comparisons: Comparison[], against: 'predicted' | 'baseline'): number {
  return (
    comparisons.filter((comparison) => Math.abs(comparison[against] - comparison.actual) <= NEAR_SECONDS).length /
    comparisons.length
  );
}

function foldComparisons(heldOut: CleanedDay, training: CleanedDay[]): { rides: Comparison[]; waits: Comparison[] } {
  const timing = deriveTiming(training);
  const rides = ridesOf(heldOut).map(({ from, to, band, seconds }) => {
    const baseline = fallbackRideSeconds(from, to);
    return { actual: seconds, predicted: timing.rides[from]?.[to]?.[band] ?? baseline, baseline };
  });
  const waits = waitCells([heldOut])
    .filter(({ band, enoughKept }) => enoughKept && band !== UNSCORED_WAIT_BAND)
    .map(({ stop, band, waitSeconds }) => {
      const baseline = fallbackWaitSeconds(band);
      return { actual: waitSeconds, predicted: timing.waits[stop]?.[band] ?? baseline, baseline };
    });
  return { rides, waits };
}

export function scoreLeaveOneDayOut(days: CleanedDay[]): ShuttleScore {
  const folds = days.map((heldOut) =>
    foldComparisons(
      heldOut,
      days.filter((day) => day !== heldOut),
    ),
  );
  const rides = folds.flatMap((fold) => fold.rides);
  const waits = folds.flatMap((fold) => fold.waits);
  const ride = {
    samples: rides.length,
    mae: maeOf(rides, 'predicted'),
    baselineMae: maeOf(rides, 'baseline'),
    withinOneMinute: shareNear(rides, 'predicted'),
    baselineWithinOneMinute: shareNear(rides, 'baseline'),
  };
  const wait = { stopBands: waits.length, mae: maeOf(waits, 'predicted'), baselineMae: maeOf(waits, 'baseline') };
  return { ride, wait, holds: ride.mae < ride.baselineMae && wait.mae < wait.baselineMae };
}
