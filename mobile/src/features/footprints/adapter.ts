/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Footprints } from '@/api/types';

// What the main screen's "오늘의 발자국" shows beside its name.
export interface FootprintsView {
  // The small faces, three at most. None while nothing is known and when no Friend left a story today.
  faces: { id: string; name: string; photo: string | null }[];
  // "친구 5명의 오늘", or "" while nothing is known and when no Friend left a story today.
  line: string;
}

const FACES = 3;

export const NO_FOOTPRINTS: FootprintsView = { faces: [], line: '' };

export function toFootprintsView(footprints: Footprints | undefined): FootprintsView {
  const count = Math.max(0, Math.trunc(footprints?.friendCount ?? 0));
  if (footprints === undefined || count === 0) {
    return NO_FOOTPRINTS;
  }
  return {
    faces: footprints.faces.slice(0, FACES).map(({ userId, name, photo }) => ({ id: userId, name, photo })),
    line: `친구 ${count}명의 오늘`,
  };
}
