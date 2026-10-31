/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { koreaTime } from '../../src/assistant/korea-time.ts';
import { bandAt, type ShuttleBand } from '../../src/shuttle/shuttle-timing.ts';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

// The time of day in Korea: "10:23:45".
export function clockTime(at: number): string {
  return koreaTime(new Date(at)).slice(11, 19);
}

export function bandOf(at: number): ShuttleBand | null {
  return bandAt(Number(clockTime(at).slice(0, 2)));
}
