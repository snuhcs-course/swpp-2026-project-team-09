import { z } from 'zod';

// A position as the phone measured it. accuracy is the radius in metres within which the phone places itself.
export const uploadPositionSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative(),
  measuredAt: z.iso.datetime({ offset: true }),
});

export type UploadPositionDto = z.infer<typeof uploadPositionSchema>;

// offCampus says that the position was outside the Campus Boundary: it was not kept, and the User is not shared.
export interface UploadedPositionDto {
  offCampus: boolean;
}

// A User's latest position, as the fetch answers it and `position` carries it.
export interface PositionDto {
  userId: string;
  latitude: number;
  longitude: number;
  measuredAt: string;
}
