import { ShuttleStop, ShuttleVehicle } from '../../generated/prisma/client.js';
import { ShuttleStopDto, toShuttleStopDto } from './shuttle-route.dto.js';

// A vehicle at the stop the operator reports, as the route serves it and the socket server sends it.
export interface ShuttleVehicleDto {
  // The operator's `carid`, which tells the vehicles apart.
  carId: string;
  stop: ShuttleStopDto;
  // The app drops a vehicle whose position is more than a minute old.
  receivedAt: Date;
}

export function toShuttleVehicleDto({
  carId,
  stop,
  receivedAt,
}: Pick<ShuttleVehicle, 'carId' | 'receivedAt'> & { stop: ShuttleStop }): ShuttleVehicleDto {
  return { carId, stop: toShuttleStopDto(stop), receivedAt };
}
