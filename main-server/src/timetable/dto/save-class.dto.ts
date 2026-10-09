/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { Weekday } from '../../generated/prisma/client.js';

const timeOfDaySchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u, 'Invalid time: expected HH:MM from 00:00 to 23:59');

const classTimeSchema = z
  .object({
    weekday: z.enum(Weekday),
    startTime: timeOfDaySchema,
    endTime: timeOfDaySchema,
    // One of the list of Places, which the service checks.
    placeId: z.uuid().nullable().default(null),
    // An empty field of the form means no room.
    room: z
      .string()
      .trim()
      .max(20)
      .transform((room) => (room === '' ? null : room))
      .nullable()
      .default(null),
  })
  .refine(({ startTime, endTime }) => endTime > startTime, {
    path: ['endTime'],
    message: 'Invalid time: must be after startTime',
  });

export interface Hours {
  weekday: Weekday;
  startTime: string;
  endTime: string;
}

// Times that touch do not cross.
export function cross(one: Hours, other: Hours): boolean {
  return one.weekday === other.weekday && one.startTime < other.endTime && other.startTime < one.endTime;
}

// A class as the app adds it and as it replaces it, whole.
export const saveClassSchema = z.object({
  courseName: z.string().trim().min(1).max(30),
  times: z
    .array(classTimeSchema)
    .min(1)
    .max(10)
    .superRefine((times, context) => {
      times.forEach((time, index) => {
        // The first time this one crosses, itself at the latest.
        const crossed = times.findIndex((earlier) => cross(earlier, time));
        if (crossed < index) {
          context.addIssue({
            code: 'custom',
            path: [index],
            message: `Invalid time: crosses times.${crossed} on the same weekday`,
          });
        }
      });
    }),
});

export type SaveClassDto = z.infer<typeof saveClassSchema>;
