import { z } from 'zod';
import { latitudeQuerySchema, longitudeQuerySchema } from '../../common/degrees-query.js';

export const walkingRouteQuerySchema = z.object({
  startLatitude: latitudeQuerySchema,
  startLongitude: longitudeQuerySchema,
  endLatitude: latitudeQuerySchema,
  endLongitude: longitudeQuerySchema,
});

export type WalkingRouteQuery = z.infer<typeof walkingRouteQuerySchema>;
