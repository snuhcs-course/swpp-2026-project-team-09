// AI-generated with Claude Opus 5.5, 2026-10-02 to 2026-10-05, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #28 #36
import { z } from 'zod';
import { latitudeQuerySchema, longitudeQuerySchema } from '../../common/degrees-query.js';

export const walkingRouteQuerySchema = z.object({
  startLatitude: latitudeQuerySchema,
  startLongitude: longitudeQuerySchema,
  endLatitude: latitudeQuerySchema,
  endLongitude: longitudeQuerySchema,
});

export type WalkingRouteQuery = z.infer<typeof walkingRouteQuerySchema>;
