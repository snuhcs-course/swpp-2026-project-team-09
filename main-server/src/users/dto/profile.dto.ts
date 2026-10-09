/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { User } from '../../generated/prisma/client.js';

export interface ProfileDto {
  name: string;
  department: string;
  admissionYear: number | null;
  hashtags: string[];
  friendId: string;
}

export function toProfileDto({ name, department, admissionYear, hashtags, friendId }: User): ProfileDto {
  return { name, department, admissionYear, hashtags, friendId };
}
