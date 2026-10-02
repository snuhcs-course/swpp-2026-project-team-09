import { ShuttleStop } from '../../generated/prisma/client.js';
import { ShuttleStopDto, toShuttleStopDto } from './shuttle-route.dto.js';

// A vehicle at the stop the operator reports, as the route serves it and the socket server sends it.
export interface ShuttleVehicleDto {
  // The operator's `carid`, which tells the vehicles apart.
  carId: string;
  stop: ShuttleStopDto;
  // The app drops a vehicle whose position is more than a minute old.
  receivedAt: Date;
}

export interface PlacedVehicle {
  carId: string;
  stop: ShuttleStop;
  receivedAt: Date;
}

// In loop order of their stops.
export function toShuttleVehicleDtos(vehicles: PlacedVehicle[]): ShuttleVehicleDto[] {
  return vehicles
    .toSorted((a, b) => a.stop.position - b.stop.position || a.carId.localeCompare(b.carId))
    .map(({ carId, stop, receivedAt }) => ({ carId, stop: toShuttleStopDto(stop), receivedAt }));
}
