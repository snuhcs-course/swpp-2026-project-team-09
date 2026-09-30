import { z } from 'zod';

function yearInKorea(): number {
  return Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()));
}

export const nameSchema = z.string().trim().min(1).max(30);

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  department: z.string().trim().min(1).max(50).nullable().optional(),
  // From 1946, when SNU was founded.
  admissionYear: z
    .number()
    .int()
    .min(1946)
    .refine((year) => year <= yearInKorea(), 'Too big: expected this year in Korea or earlier')
    .nullable()
    .optional(),
  hashtags: z
    .array(z.string().trim().min(1).max(30).regex(/^\S*$/u, 'Invalid string: must not contain whitespace'))
    .max(20)
    .refine((hashtags) => new Set(hashtags).size === hashtags.length, 'Invalid input: must not repeat a hashtag')
    .optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
