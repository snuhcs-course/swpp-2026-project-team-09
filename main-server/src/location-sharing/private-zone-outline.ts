/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, HttpStatus } from '@nestjs/common';
import { placeLabelOf } from '../assistant/gathering/place-naming.js';
import { type CampusBoundary } from '../common/campus-boundary.js';
import { enclosesByWinding, metresToRing, middleOf, type Position, squareMetresInside } from '../common/geometry.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { addPrivateZoneSchema } from './dto/private-zone.dto.js';

const MIN_POINTS = 3;
const MAX_POINTS = 200;
// So that a loop round a building at the campus's edge need not squeeze between its wall and the Boundary.
const OFF_CAMPUS_METRES = 300;
const MIN_SQUARE_METRES = 300;
// The Campus Boundary's margin: the edge leans towards hiding.
const EDGE_METRES = 10;

export const NO_PLACE_LABEL = '그린 구역';

const zoneRefused = (code: string, message: string): BadRequestException =>
  new BadRequestException({ statusCode: HttpStatus.BAD_REQUEST, error: 'Bad Request', code, message });

function withoutRepeat(drawn: Position[]): Position[] {
  const [first] = drawn;
  const last = drawn.at(-1);
  const repeats =
    first !== undefined && last !== undefined && first.latitude === last.latitude && first.longitude === last.longitude;
  return repeats ? drawn.slice(0, -1) : drawn;
}

function nearCampus(boundary: CampusBoundary, point: Position): boolean {
  return boundary.contains(point) || metresToRing(boundary.outline, point) <= OFF_CAMPUS_METRES;
}

// The outline the body draws, without a last point that repeats the first, once it passes every check.
export function outlineOf(body: unknown, boundary: CampusBoundary): Position[] {
  const parsed = addPrivateZoneSchema.safeParse(body);
  if (!parsed.success) {
    throw zoneRefused('PRIVATE_ZONE_INVALID', 'The body is { outline: { latitude, longitude }[] }.');
  }
  const outline = withoutRepeat(parsed.data.outline);
  if (outline.length < MIN_POINTS || outline.length > MAX_POINTS) {
    throw zoneRefused('PRIVATE_ZONE_INVALID', `An outline has ${MIN_POINTS} to ${MAX_POINTS} points.`);
  }
  if (!outline.some((point) => boundary.contains(point)) || !outline.every((point) => nearCampus(boundary, point))) {
    throw zoneRefused(
      'PRIVATE_ZONE_OFF_CAMPUS',
      `Each point lies within ${OFF_CAMPUS_METRES} m of the Campus Boundary, and one inside it.`,
    );
  }
  if (squareMetresInside(outline) < MIN_SQUARE_METRES) {
    throw zoneRefused('PRIVATE_ZONE_TOO_SMALL', `An outline encloses at least ${MIN_SQUARE_METRES} m².`);
  }
  return outline;
}

// Whether the zone hides a User at the position: inside the outline by the rule the app's fill uses, or near its edge.
export function zoneHolds(outline: readonly Position[], position: Position): boolean {
  return enclosesByWinding(outline, position) || metresToRing(outline, position) <= EDGE_METRES;
}

export function zoneLabel(
  outline: readonly Position[],
  nearTo: (position: Position) => Pick<PlaceDto, 'number' | 'name'> | null,
): string {
  const place = nearTo(middleOf(outline));
  return place === null ? NO_PLACE_LABEL : `${placeLabelOf(place)} 근처`;
}
