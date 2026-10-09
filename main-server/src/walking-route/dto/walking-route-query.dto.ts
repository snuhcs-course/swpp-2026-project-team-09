/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { latitudeQuerySchema, longitudeQuerySchema } from '../../common/degrees-query.js';

export const walkingRouteQuerySchema = z.object({
  startLatitude: latitudeQuerySchema,
  startLongitude: longitudeQuerySchema,
  endLatitude: latitudeQuerySchema,
  endLongitude: longitudeQuerySchema,
});

export type WalkingRouteQuery = z.infer<typeof walkingRouteQuerySchema>;
