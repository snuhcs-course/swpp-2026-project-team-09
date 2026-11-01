/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { Affiliation } from '../../generated/prisma/client.js';

function yearInKorea(): number {
  return Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()));
}

export const nameSchema = z.string().trim().min(1).max(30);

// A double major is written out in the one text, such as "컴퓨터공학부, 경제학부".
export const departmentSchema = z.string().trim().min(1).max(50);

// A 학번, such as 2026-12345: four digits, five more, and the hyphen between them or not. It is kept as the nine
// digits. Empty, it is none.
export const studentNumberSchema = z
  .string()
  .trim()
  .regex(/^(?:\d{4}-?\d{5})?$/u, 'Invalid string: must be a 학번 such as 2026-12345')
  .transform((studentNumber) => (studentNumber === '' ? null : studentNumber.replace('-', '')))
  .nullable();

// 학적상 이름, the name the library knows, with the name's limit. Empty, it is none, and the name is used.
export const registeredNameSchema = z
  .string()
  .trim()
  .max(30)
  .transform((registeredName) => (registeredName === '' ? null : registeredName))
  .nullable();

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  department: departmentSchema.optional(),
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
  studentNumber: studentNumberSchema.optional(),
  registeredName: registeredNameSchema.optional(),
  affiliation: z.enum(Affiliation).nullable().optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
