/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { departmentSchema, nameSchema } from './dto/update-profile.dto.js';

// The name and the department that the SNU account gives, each null where it gives none the profile would take.
export interface AccountProfile {
  name: string | null;
  department: string | null;
}

// An SNU account's Google name reads "홍길동 / 학생 / 컴퓨터공학부". A name without "/" is the name alone.
export function googleNameParts(googleName: string): string[] {
  return googleName === '' ? [] : googleName.split('/');
}

export function accountProfileOf(googleName: string): AccountProfile {
  const [name, , department] = googleNameParts(googleName);
  return {
    name: nameSchema.safeParse(name).data ?? null,
    department: departmentSchema.safeParse(department).data ?? null,
  };
}

// The fields the account gives, to be stored over whatever the User sent.
export function accountFieldsOf(googleName: string): { name?: string; department?: string } {
  const { name, department } = accountProfileOf(googleName);
  return { ...(name === null ? {} : { name }), ...(department === null ? {} : { department }) };
}
