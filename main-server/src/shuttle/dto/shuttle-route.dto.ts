import { z } from 'zod';
import { ShuttleStop } from '../../generated/prisma/client.js';

export interface ShuttleStopDto {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// The line as the seed stored it.
export const lineSchema = z.array(z.object({ latitude: z.number(), longitude: z.number() }));

export interface ShuttleRouteDto {
  // As the route page writes them. Null until the route page's first Collection.
  serviceHours: string | null;
  // In loop order.
  stops: ShuttleStopDto[];
  line: z.infer<typeof lineSchema>;
}

export function toShuttleStopDto({ id, name, latitude, longitude }: ShuttleStop): ShuttleStopDto {
  return { id, name, latitude, longitude };
}
