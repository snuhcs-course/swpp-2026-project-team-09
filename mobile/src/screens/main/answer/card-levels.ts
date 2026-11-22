/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The answer card's heights: lowered, raised up to under "←", and full, its top just under the status bar (P04 tickets
// 12 and 52). A drag moves one step from where it started: from the lowered card up to raised, from the raised card up
// to full or down to lowered, from the full card down to raised. Worklets: a drag works them out on the UI thread.
export type Level = 'lowered' | 'raised' | 'full';

// The content's height at each level; `full` is null for a card without that step.
export interface LevelHeights {
  lowered: number;
  raised: number;
  full: number | null;
}

export function levelOf(raised: boolean, full: boolean): Level {
  'worklet';
  if (!raised) {
    return 'lowered';
  }
  return full ? 'full' : 'raised';
}

export function heightOf(level: Level, { lowered, raised, full }: LevelHeights): number {
  'worklet';
  if (level === 'lowered') {
    return lowered;
  }
  return level === 'full' ? (full ?? raised) : raised;
}

// The heights a drag from `start` moves the content between.
export function rangeOf(start: Level, heights: LevelHeights): { low: number; high: number } {
  'worklet';
  const top = heights.full ?? heights.raised;
  if (start === 'lowered') {
    return { low: heights.lowered, high: heights.raised };
  }
  return start === 'raised' ? { low: heights.lowered, high: top } : { low: heights.raised, high: top };
}

// Where a drag from `start` let go with the content at `at`, a fling carried on, comes to: the nearer height of its
// step.
export function levelAt(start: Level, at: number, { lowered, raised, full }: LevelHeights): Level {
  'worklet';
  const below = (lowered + raised) / 2;
  const above = full === null ? Number.POSITIVE_INFINITY : (raised + full) / 2;
  if (start === 'full') {
    return at < above ? 'raised' : 'full';
  }
  if (start === 'lowered') {
    return at > below ? 'raised' : 'lowered';
  }
  if (at > above) {
    return 'full';
  }
  return at < below ? 'lowered' : 'raised';
}
