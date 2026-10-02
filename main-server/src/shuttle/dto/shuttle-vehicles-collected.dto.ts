import { z } from 'zod';
import { Source } from '../../generated/prisma/client.js';

// A vehicle as the operator reports it: its `carid` and its position on the drawing, in pixels.
const vehicleSchema = z.strictObject({
  carId: z.string().min(1),
  x: z.number(),
  y: z.number(),
});

// What one Collection of the operator's vehicle positions read, sent by the worker as `shuttle-vehicles-collected`.
export const shuttleVehiclesCollectedSchema = z.strictObject({
  source: z.literal(Source.shuttle_vehicles),
  // When the worker received the operator's answer.
  collectedAt: z.iso.datetime({ offset: true }),
  // Every vehicle the operator reports. Storing replaces the vehicles with them.
  vehicles: z
    .array(vehicleSchema)
    .refine(
      (vehicles) => new Set(vehicles.map(({ carId }) => carId)).size === vehicles.length,
      'Each vehicle must appear once',
    ),
});

export type ShuttleVehiclesCollectedMessage = z.infer<typeof shuttleVehiclesCollectedSchema>;
