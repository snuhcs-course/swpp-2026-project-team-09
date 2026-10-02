import { z } from 'zod';

// A query value is text, and Number('') is 0, so only text written as a decimal number is read as one.
const degrees = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/u, 'Invalid input: expected a decimal number')
  .transform(Number);

const latitude = degrees.pipe(z.number().min(-90).max(90));
const longitude = degrees.pipe(z.number().min(-180).max(180));

export const walkingRouteQuerySchema = z.object({
  startLatitude: latitude,
  startLongitude: longitude,
  endLatitude: latitude,
  endLongitude: longitude,
});

export type WalkingRouteQuery = z.infer<typeof walkingRouteQuerySchema>;
