/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Position } from '../../common/geometry.js';
import { ShuttleStop } from '../../generated/prisma/client.js';

export const shuttleStopSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export type ShuttleStopDto = z.infer<typeof shuttleStopSchema>;

export interface ShuttleRouteDto {
  // As the route page writes them.
  serviceHours: string;
  // In loop order.
  stops: ShuttleStopDto[];
  line: Position[];
}

export function toShuttleStopDto({ id, name, latitude, longitude }: ShuttleStop): ShuttleStopDto {
  return { id, name, latitude, longitude };
}
