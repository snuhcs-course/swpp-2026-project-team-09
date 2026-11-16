/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';

// Outlines of Private Zones in metres round a position, as the main server's tests draw them.

const METRES_PER_DEGREE = 111_195;

export const BUILDING_301: LatLng = { latitude: 37.45016, longitude: 126.95259 };

// The position that many metres east and north of the one given.
export function offset({ latitude, longitude }: LatLng, east: number, north: number): LatLng {
  return {
    latitude: latitude + north / METRES_PER_DEGREE,
    longitude: longitude + east / (METRES_PER_DEGREE * Math.cos((latitude * Math.PI) / 180)),
  };
}

// An open ring, the rectangle of those sides round the position, drawn anticlockwise.
export function rectangleRound(middle: LatLng, eastWest: number, northSouth: number): LatLng[] {
  const [east, north] = [eastWest / 2, northSouth / 2];
  return [
    offset(middle, -east, -north),
    offset(middle, east, -north),
    offset(middle, east, north),
    offset(middle, -east, north),
  ];
}

export function squareRound(middle: LatLng, side: number): LatLng[] {
  return rectangleRound(middle, side, side);
}

// A figure eight of two equal lobes, one west and one east of the position, which it crosses: a lemniscate that
// reaches `half` metres each way.
export function figureEight(middle: LatLng, half: number, points = 40): LatLng[] {
  return Array.from({ length: points }, (_, index) => {
    const angle = (2 * Math.PI * index) / points;
    const shrink = 1 + Math.sin(angle) ** 2;
    return offset(middle, (half * Math.cos(angle)) / shrink, (half * Math.sin(angle) * Math.cos(angle)) / shrink);
  });
}

// A five-pointed star drawn as one loop, each point `radius` metres from the position: its middle is gone round twice.
export function starRound(middle: LatLng, radius: number): LatLng[] {
  return [0, 2, 4, 1, 3].map((corner) => {
    const angle = Math.PI / 2 + (2 * Math.PI * corner) / 5;
    return offset(middle, radius * Math.cos(angle), radius * Math.sin(angle));
  });
}
