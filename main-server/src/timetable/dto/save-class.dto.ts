import { z } from 'zod';
import { Weekday } from '../../generated/prisma/client.js';

const timeOfDaySchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u, 'Invalid time: expected HH:MM from 00:00 to 23:59');

// A class as the app adds it and as it edits it, whole.
export const saveClassSchema = z
  .object({
    courseName: z.string().trim().min(1).max(30),
    // Kept in the order of the week, Monday first.
    weekdays: z
      .array(z.enum(Weekday))
      .min(1)
      .refine((weekdays) => new Set(weekdays).size === weekdays.length, 'Invalid input: must not repeat a weekday')
      .transform((weekdays) => Object.values(Weekday).filter((weekday) => weekdays.includes(weekday))),
    startTime: timeOfDaySchema,
    endTime: timeOfDaySchema,
    // One of the list of Places, which the service checks.
    placeId: z.uuid(),
    room: z.string().trim().min(1).max(20).nullable().default(null),
  })
  .refine(({ startTime, endTime }) => endTime > startTime, {
    path: ['endTime'],
    message: 'Invalid time: must be after startTime',
  });

export type SaveClassDto = z.infer<typeof saveClassSchema>;
