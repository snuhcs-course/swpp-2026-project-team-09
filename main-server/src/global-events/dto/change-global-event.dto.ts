import { z } from 'zod';

const timeSchema = z.iso
  .datetime({ offset: true })
  .transform((time) => new Date(time))
  .nullable();

const fields = {
  title: z.string().trim().min(1).max(200),
  description: z.string(),
  startsAt: timeSchema,
  endsAt: timeSchema,
  place: z.string().trim().min(1).max(200).nullable(),
  // Inside the Campus Boundary, which GlobalEventsService checks.
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
};

// A field left out stays as it is, so these hold only when the body gives both.
function endAfterStart({ startsAt, endsAt }: { startsAt?: Date | null; endsAt?: Date | null }): boolean {
  return startsAt === null || startsAt === undefined || endsAt === null || endsAt === undefined || endsAt > startsAt;
}

function positionTogether({ latitude, longitude }: { latitude?: number | null; longitude?: number | null }): boolean {
  return (latitude === undefined) === (longitude === undefined) && (latitude === null) === (longitude === null);
}

const END_AFTER_START = { path: ['endsAt'], message: 'The end must be after the start' };

const POSITION_TOGETHER = { path: ['latitude'], message: 'Give latitude and longitude together' };

// A Draft an Administrator creates. Left out is the same as null.
export const createGlobalEventSchema = z
  .strictObject({
    title: fields.title,
    description: fields.description,
    startsAt: fields.startsAt.default(null),
    endsAt: fields.endsAt.default(null),
    place: fields.place.default(null),
    latitude: fields.latitude.default(null),
    longitude: fields.longitude.default(null),
  })
  .refine(endAfterStart, END_AFTER_START)
  .refine(positionTogether, POSITION_TOGETHER);

export type CreateGlobalEventDto = z.infer<typeof createGlobalEventSchema>;

// The version the Administrator loaded, which every change carries.
const versionSchema = z.int().positive();

// An edit of a Draft or a published event. A field left out stays as it is, and null clears an optional one.
export const editGlobalEventSchema = z
  .strictObject({
    version: versionSchema,
    title: fields.title.optional(),
    description: fields.description.optional(),
    startsAt: fields.startsAt.optional(),
    endsAt: fields.endsAt.optional(),
    place: fields.place.optional(),
    latitude: fields.latitude.optional(),
    longitude: fields.longitude.optional(),
  })
  .refine(endAfterStart, END_AFTER_START)
  .refine(positionTogether, POSITION_TOGETHER);

export type EditGlobalEventDto = z.infer<typeof editGlobalEventSchema>;

export const stateChangeSchema = z.strictObject({ version: versionSchema });

export type StateChangeDto = z.infer<typeof stateChangeSchema>;
