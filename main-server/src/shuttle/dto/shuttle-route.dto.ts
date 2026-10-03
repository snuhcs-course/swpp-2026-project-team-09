import { type Position } from '../../common/geometry.js';
import { ShuttleStop } from '../../generated/prisma/client.js';

export interface ShuttleStopDto {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

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
