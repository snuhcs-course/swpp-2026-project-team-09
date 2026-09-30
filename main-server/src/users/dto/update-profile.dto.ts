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
  // Kept without the '#' in front, which the app adds when it shows one.
  hashtags: z
    .array(
      z
        .string()
        .trim()
        .overwrite((hashtag) => hashtag.replace(/^#+/u, ''))
        .min(1)
        .max(30)
        .regex(/^\S*$/u, 'Invalid string: must not contain whitespace'),
    )
    .max(20)
    .refine(
      (hashtags) => new Set(hashtags.map((hashtag) => hashtag.toLowerCase())).size === hashtags.length,
      'Invalid input: must not repeat a hashtag, whatever its case',
    )
    .optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
