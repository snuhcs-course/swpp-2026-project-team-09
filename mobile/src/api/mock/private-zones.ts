/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import {
  isTooSmall,
  metresBetween,
  metresToRing,
  middleOf,
  OUTLINE_MAX_POINTS,
  PRIVATE_ZONES_MAX,
  zoneHolds,
} from '@/api/private-zone-outline';
import type { PrivateZone } from '@/api/private-zone-types';
import type { LatLng } from '@/api/types';
import { now } from '@/clock';
import { CAMPUS_BOUNDS, isInside } from '@/map/campus';
import { answer } from './answer';
import { PLACES } from './data/places';

// The User's Private Zones as the main server keeps and refuses them (main-server's README, Private Zones), in memory
// while the app runs. The mock's Campus Boundary is the on-campus rectangle.

const OUTLINE_MIN_POINTS = 3;
const OFF_CAMPUS_METRES = 300;
const NEAREST_PLACE_METRES = 150;

const { south, west, north, east } = CAMPUS_BOUNDS;
const CAMPUS_RING: readonly LatLng[] = [
  { latitude: south, longitude: west },
  { latitude: south, longitude: east },
  { latitude: north, longitude: east },
  { latitude: north, longitude: west },
];

let zones: PrivateZone[] = [];
let made = 0;

// None, as the app starts. For the tests.
export function resetMockPrivateZones(): void {
  zones = [];
  made = 0;
}

function withoutRepeat(drawn: readonly LatLng[]): readonly LatLng[] {
  const [first] = drawn;
  const last = drawn.at(-1);
  const repeats =
    first !== undefined && last !== undefined && first.latitude === last.latitude && first.longitude === last.longitude;
  return repeats ? drawn.slice(0, -1) : drawn;
}

function nearCampus(point: LatLng): boolean {
  return isInside(point, CAMPUS_BOUNDS) || metresToRing(CAMPUS_RING, point) <= OFF_CAMPUS_METRES;
}

// After the Place nearest the outline's middle.
function labelOf(outline: readonly LatLng[]): string {
  const middle = middleOf(outline);
  const [nearest] = PLACES.map((place) => ({ place, metres: metresBetween(place, middle) })).toSorted(
    (one, other) => one.metres - other.metres,
  );
  if (nearest === undefined || nearest.metres > NEAREST_PLACE_METRES) {
    return '그린 구역';
  }
  const { number, name } = nearest.place;
  return `${number === null ? name : `${number}동`} 근처`;
}

function add(drawn: readonly LatLng[]): PrivateZone {
  const outline = withoutRepeat(drawn);
  if (outline.length < OUTLINE_MIN_POINTS || outline.length > OUTLINE_MAX_POINTS) {
    throw new ApiError(400, 'PRIVATE_ZONE_INVALID');
  }
  if (!outline.some((point) => isInside(point, CAMPUS_BOUNDS)) || !outline.every((point) => nearCampus(point))) {
    throw new ApiError(400, 'PRIVATE_ZONE_OFF_CAMPUS');
  }
  if (isTooSmall(outline)) {
    throw new ApiError(400, 'PRIVATE_ZONE_TOO_SMALL');
  }
  if (zones.length >= PRIVATE_ZONES_MAX) {
    throw new ApiError(409, 'PRIVATE_ZONES_FULL');
  }
  made += 1;
  const kept = {
    id: `zone-${String(made)}`,
    label: labelOf(outline),
    outline: [...outline],
    createdAt: now().toISOString(),
  };
  zones = [...zones, kept];
  return kept;
}

function remove(zoneId: string): void {
  if (!zones.some(({ id }) => id === zoneId)) {
    throw new ApiError(404, 'PRIVATE_ZONE_NOT_FOUND');
  }
  zones = zones.filter(({ id }) => id !== zoneId);
}

// Whether a position uploaded now would not be kept for being inside a zone.
export function insidePrivateZone(position: LatLng): boolean {
  return zones.some(({ outline }) => zoneHolds(outline, position));
}

type MockPrivateZones = Pick<ApiClient, 'privateZones' | 'addPrivateZone' | 'removePrivateZone'>;

export const mockPrivateZones: MockPrivateZones = {
  privateZones: () => answer('privateZones', () => [...zones], []),
  addPrivateZone: (outline) => answer('addPrivateZone', () => add(outline)),
  removePrivateZone: async (zoneId) => {
    await answer('removePrivateZone', () => {
      remove(zoneId);
    });
  },
};
