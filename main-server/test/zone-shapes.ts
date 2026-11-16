/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { METRES_PER_DEGREE, metresPerDegreeEast, type Position } from '../src/common/geometry.js';

// The position that many metres east and north of the one given.
export function offset({ latitude, longitude }: Position, east: number, north: number): Position {
  return {
    latitude: latitude + north / METRES_PER_DEGREE,
    longitude: longitude + east / metresPerDegreeEast(latitude),
  };
}

// An open ring, the square of that side round the position, drawn anticlockwise.
export function squareRound(middle: Position, side: number): Position[] {
  const half = side / 2;
  return [
    offset(middle, -half, -half),
    offset(middle, half, -half),
    offset(middle, half, half),
    offset(middle, -half, half),
  ];
}

// An open ring of that many points on the circle of that radius round the position.
export function circleRound(middle: Position, radius: number, points: number): Position[] {
  return Array.from({ length: points }, (_, index) => {
    const angle = (2 * Math.PI * index) / points;
    return offset(middle, radius * Math.cos(angle), radius * Math.sin(angle));
  });
}
