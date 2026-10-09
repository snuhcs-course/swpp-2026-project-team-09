/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { shuttleStopSchema } from './shuttle-route.dto.js';

// A vehicle at the stop the operator reports, as Redis keeps it, the route serves it and the socket server sends it.
export const shuttleVehicleSchema = z.object({
  // The operator's `carid`, which tells the vehicles apart.
  carId: z.string(),
  stop: shuttleStopSchema,
  // ISO 8601. The app drops a vehicle whose position is more than a minute old.
  receivedAt: z.string(),
});

export type ShuttleVehicleDto = z.infer<typeof shuttleVehicleSchema>;
