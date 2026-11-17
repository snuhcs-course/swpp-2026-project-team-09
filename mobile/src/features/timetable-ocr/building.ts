/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Place } from '@/api/types';

import { roomOf, type RoomText } from './block-text';

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

// The link of a block's room, when it passes the rules: it matches the room pattern on its whole length, none of its
// words was cut at the block's sides, it was read inside one OCR element, read whole, and its building is a Place. A
// misread digit can land on another real building (301 read as 307), and a User must never be sent to the wrong
// place, while a room left unlinked is harmless. ML Kit's confidence is not read (P15-52): iOS gives none, and Android
// and iOS follow the same rule.
export function linkRoom(line: RoomText | null, places: readonly Place[]): Link | null {
  if (line === null) {
    return null;
  }
  const room = roomOf(line.text);
  if (room === null) {
    return null;
  }
  return line.unclipped && line.oneElement ? buildingOf(room, places) : null;
}
