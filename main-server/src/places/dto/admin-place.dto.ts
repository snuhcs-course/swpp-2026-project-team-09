import { z } from 'zod';
import type { Position } from '../../common/geometry.js';
import { Place, PlaceOrigin } from '../../generated/prisma/client.js';
import { PlaceDto, toPlaceDto } from './place.dto.js';

// Each a closed ring, as the seed stored it.
const outlinesSchema = z.array(z.array(z.object({ latitude: z.number(), longitude: z.number() })));

// A Place as an Administrator reads it, to check how the seed placed and outlined it.
export interface AdminPlaceDto extends PlaceDto {
  origin: PlaceOrigin;
  outlines: Position[][];
}

export function toAdminPlaceDto(place: Place): AdminPlaceDto {
  return { ...toPlaceDto(place), origin: place.origin, outlines: outlinesSchema.parse(place.outlines) };
}
