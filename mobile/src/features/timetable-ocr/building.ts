/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Place } from '@/api/types';

import { type BlockLine, roomOf } from './block-text';

// Linking a room to a campus building.

export interface Link {
  placeId: string;
  // The building's number, "43-1".
  building: string;
  // The rest after the building, "304", or null when nothing is left.
  room: string | null;
}

// The building of a room: the longest leading run of its parts that is a Place's number. `43-1-304` → 43-1 and 304;
// `302-311-1` → 302 and 311-1. Null when no run is one.
export function buildingOf(room: string, places: readonly Place[]): Link | null {
  const byNumber = new Map(
    places.flatMap((place) => (place.number === null ? [] : [[place.number, place.id] as const])),
  );
  const parts = room.split('-');
  for (let length = parts.length; length >= 1; length -= 1) {
    const building = parts.slice(0, length).join('-');
    const placeId = byNumber.get(building);
    if (placeId !== undefined) {
      const rest = parts.slice(length).join('-');
      return { placeId, building, room: rest === '' ? null : rest };
    }
  }
  return null;
}

// The confidence a room line needs before it is linked (Android). Chosen on the four reference screenshots, whose
// room lines read 0.82–0.95: see accuracy.md.
export const ROOM_CONFIDENCE = 0.8;

// The link of a block's room line, when the line passes the rules: it matches the room pattern on its whole length
// and is read with enough confidence. Without a confidence (iOS) the stricter rule stands in: the line is a single OCR
// element, read whole. Either way the building must be a Place.
export function linkRoom(line: BlockLine | null, places: readonly Place[]): Link | null {
  if (line === null) {
    return null;
  }
  const room = roomOf(line.text);
  if (room === null) {
    return null;
  }
  const trusted =
    line.confidence === null ? line.wholeElement && line.elements === 1 : line.confidence >= ROOM_CONFIDENCE;
  return trusted ? buildingOf(room, places) : null;
}
