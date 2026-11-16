/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';

// A position as the phone measured it. accuracy is the radius in metres within which the phone places itself.
export const uploadPositionSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative(),
  measuredAt: z.iso.datetime({ offset: true }),
});

export type UploadPositionDto = z.infer<typeof uploadPositionSchema>;

// offCampus says that the position was outside the Campus Boundary, and privateZone that it was inside one of the
// User's Private Zones: either way it was not kept, and the User is not shared.
export interface UploadedPositionDto {
  offCampus: boolean;
  privateZone: boolean;
}

// A User's latest position as a viewer sees it, as the fetch answers it and `position` carries it: the position itself
// at 'exact', and at 'building' the Place the User is in, at the Place's own point.
export type PositionDto = {
  userId: string;
  latitude: number;
  longitude: number;
  measuredAt: string;
} & ({ level: 'exact' } | { level: 'building'; placeId: string });
