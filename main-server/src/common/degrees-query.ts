// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #36
import { z } from 'zod';

// A query value is text, and Number('') is 0, so only text written as a decimal number is read as one.
const degreesSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/u, 'Invalid input: expected a decimal number')
  .transform(Number);

export const latitudeQuerySchema = degreesSchema.pipe(z.number().min(-90).max(90));
export const longitudeQuerySchema = degreesSchema.pipe(z.number().min(-180).max(180));
