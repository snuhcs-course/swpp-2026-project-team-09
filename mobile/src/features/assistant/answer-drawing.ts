/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
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
  pick: LatLng | null;
  // The people the scene draws, the User included.
  userIds: string[];
}
