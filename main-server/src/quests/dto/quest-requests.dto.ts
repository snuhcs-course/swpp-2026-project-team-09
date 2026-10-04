import { z } from 'zod';

export const attendSchema = z.strictObject({ globalEventId: z.uuid() });

export type AttendDto = z.infer<typeof attendSchema>;

export const placeSchema = z.union([
  z.strictObject({ placeId: z.uuid() }),
  // A point on the map, with the label the app showed for it.
  z.strictObject({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    label: z.string().trim().min(1).max(50),
  }),
]);

// What a Holder writes when adding or editing a Sub Quest. Left out is the same as null.
export const subQuestContentSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(50),
    startsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    place: placeSchema.nullable().default(null),
  })
  .refine(({ startsAt, endsAt }) => startsAt === null || endsAt === null || new Date(endsAt) > new Date(startsAt), {
    path: ['endsAt'],
    message: 'The end must be after the start',
  });

export type SubQuestContentDto = z.infer<typeof subQuestContentSchema>;
