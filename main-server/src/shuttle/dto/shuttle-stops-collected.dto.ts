import { z } from 'zod';
import { Source } from '../../generated/prisma/client.js';

// A stop of the route page, at its place on the operator's drawing, in pixels. The INTEGER columns' range.
const stopSchema = z.strictObject({
  name: z.string().min(1),
  left: z.int32().nonnegative(),
  top: z.int32().nonnegative(),
});

// What one Collection of the operator's route page read, posted by the worker to `/shuttle/stops/collected`.
export const shuttleStopsCollectedSchema = z.strictObject({
  source: z.literal(Source.shuttle_stops),
  collectedAt: z.iso.datetime({ offset: true }),
  stops: z.array(stopSchema).min(1),
  serviceHours: z.string().min(1),
});

export type ShuttleStopsCollectedMessage = z.infer<typeof shuttleStopsCollectedSchema>;
