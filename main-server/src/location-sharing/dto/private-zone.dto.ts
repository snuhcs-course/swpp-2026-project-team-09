/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Position } from '../../common/geometry.js';

const pointSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// The body of POST /users/me/private-zones. The count of points is checked after a last one that repeats the first is
// dropped.
export const addPrivateZoneSchema = z.strictObject({ outline: z.array(pointSchema) });

// The outline as the database holds it.
export const storedOutlineSchema = z.array(z.object({ latitude: z.number(), longitude: z.number() }));

export interface PrivateZoneDto {
  id: string;
  label: string;
  // Left open: the last point joins the first.
  outline: Position[];
  createdAt: string;
}

export interface PrivateZonesDto {
  zones: PrivateZoneDto[];
}
