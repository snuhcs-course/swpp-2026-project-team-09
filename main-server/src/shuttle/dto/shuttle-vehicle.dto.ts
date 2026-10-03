import { z } from 'zod';

// A vehicle at the stop the operator reports, as Redis keeps it, the route serves it and the socket server sends it.
export const shuttleVehicleSchema = z.object({
  // The operator's `carid`, which tells the vehicles apart.
  carId: z.string(),
  stop: z.object({ id: z.string(), name: z.string(), latitude: z.number(), longitude: z.number() }),
  // ISO 8601. The app drops a vehicle whose position is more than a minute old.
  receivedAt: z.string(),
});

export type ShuttleVehicleDto = z.infer<typeof shuttleVehicleSchema>;
