/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import type { MapLine, MarkerLook } from '@/map';

export interface AnswerThing {
  // Unique within a drawing.
  id: string;
  // What a screen reader says.
  name: string;
  position: LatLng;
  // An 'answer' look.
  look: MarkerLook;
  // A press shows this Plan; null takes no press.
  planId: string | null;
  // The higher is drawn on top.
  order: number;
}

export interface AnswerDrawing {
  things: AnswerThing[];
  lines: MapLine[];
  // What the camera fits.
  points: LatLng[];
  // The Plan's own points: its people, its pick, its next Class, and its flags. The camera keeps these in view when
  // not every point fits.
  own: LatLng[];
  // What the camera keeps in view in place of `own` when not every point fits: a meal answer's every candidate. Left
  // out, `own`.
  keep?: LatLng[];
  // The destination: the pick, or without one the next item.
  pick: LatLng | null;
  // The people the scene draws, the User included.
  userIds: string[];
}

const METRES_PER_DEGREE = 111_320;

// The metres east and north from one position to another.
export function offset(from: LatLng, to: LatLng): { east: number; north: number } {
  const north = (to.latitude - from.latitude) * METRES_PER_DEGREE;
  const east = (to.longitude - from.longitude) * METRES_PER_DEGREE * Math.cos((from.latitude * Math.PI) / 180);
  return { east, north };
}

// The metres in a straight line from one position to another.
export function metresBetween(from: LatLng, to: LatLng): number {
  const { east, north } = offset(from, to);
  return Math.hypot(east, north);
}
