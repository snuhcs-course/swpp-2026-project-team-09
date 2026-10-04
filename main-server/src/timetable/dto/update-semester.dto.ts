import { z } from 'zod';

// Changes only the days sent. `null` clears one.
export const updateSemesterSchema = z.object({
  semesterFirstDay: z.iso.date().nullable().optional(),
  semesterLastDay: z.iso.date().nullable().optional(),
});

export type UpdateSemesterDto = z.infer<typeof updateSemesterSchema>;
