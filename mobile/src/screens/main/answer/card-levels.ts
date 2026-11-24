/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The answer sheet's steps (P04 ticket 61): low, its header and about two lines; middle, about half the stage; high,
// just under the time card. A card shorter than a step stops at its own height, so two steps may share one, and only
// the steps of different heights are kept. Worklets: a drag works them out on the UI thread.
export type Level = 'low' | 'mid' | 'high';

export const LEVELS: readonly Level[] = ['low', 'mid', 'high'];

// The content's height that shows at each step.
export interface LevelHeights {
  low: number;
  mid: number;
  high: number;
}

// Faster than this, in points a second, a let-go is a fling (Android's sheet takes 500 pixels a second).
export const FLING_SPEED = 500;
// A let-go carries on this many seconds of its speed before the nearest step is chosen (Android's sheet, 0.1).
export const CARRY_S = 0.1;
// Within this of a step, the card stands at it.
const AT_STEP = 1;

export function heightOf(level: Level, heights: LevelHeights): number {
  'worklet';
  return heights[level];
}

// The steps of different heights, lowest first: of steps that share a height, the lowest stands for them.
export function stepsOf(heights: LevelHeights): Level[] {
  'worklet';
  const steps: Level[] = [];
  for (const level of LEVELS) {
    const last = steps.at(-1);
    if (last === undefined || heights[level] > heights[last] + AT_STEP) {
      steps.push(level);
    }
  }
  return steps;
}

function nearest(steps: readonly Level[], at: number, heights: LevelHeights): Level {
  'worklet';
  let best = steps[0] ?? 'low';
  for (const level of steps) {
    if (Math.abs(heights[level] - at) < Math.abs(heights[best] - at)) {
      best = level;
    }
  }
  return best;
}

// The next step up from `at`, or the highest; the next step down, or null below the lowest.
function above(steps: readonly Level[], at: number, heights: LevelHeights): Level {
  'worklet';
  return steps.find((level) => heights[level] > at + AT_STEP) ?? steps.at(-1) ?? 'low';
}

function below(steps: readonly Level[], at: number, heights: LevelHeights): Level | null {
  'worklet';
  return steps.findLast((level) => heights[level] < at - AT_STEP) ?? null;
}

interface LetGo {
  // The step the drag started from.
  start: Level;
  // The content's height that shows at the let-go.
  at: number;
  // The finger's speed down, in points a second; up is negative.
  velocity: number;
  heights: LevelHeights;
  // How far under low a drag from low is let go to close the answer.
  closeAt: number;
  // Whether the card closes from low; a card that cannot stays.
  closable: boolean;
}

// Where a let-go lands: a fling on the next step in its direction from where the card is, a slower let-go on the step
// nearest where its speed would carry it. From low, one more drag down past `closeAt`, or a fling down, closes the
// answer; a drag that started higher stops at low.
export function landingOf({ start, at, velocity, heights, closeAt, closable }: LetGo): Level | 'close' {
  'worklet';
  const steps = stepsOf(heights);
  const fromLow = closable && start === 'low';
  if (Math.abs(velocity) > FLING_SPEED) {
    if (velocity < 0) {
      return above(steps, at, heights);
    }
    const next = below(steps, at, heights);
    if (next !== null) {
      return next;
    }
    return fromLow && at < heights.low - AT_STEP ? 'close' : 'low';
  }
  const carried = at - velocity * CARRY_S;
  if (fromLow && heights.low - carried > closeAt) {
    return 'close';
  }
  return nearest(steps, carried, heights);
}
