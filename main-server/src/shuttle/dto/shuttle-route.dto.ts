import { ShuttleStop } from '../../generated/prisma/client.js';

export interface ShuttleStopDto {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface ShuttleRouteDto {
  // As the route page writes them. Null until the route page's first Collection.
  serviceHours: string | null;
  // In loop order.
  stops: ShuttleStopDto[];
  line: { latitude: number; longitude: number }[];
}

export function toShuttleStopDto({ id, name, latitude, longitude }: ShuttleStop): ShuttleStopDto {
  return { id, name, latitude, longitude };
}
