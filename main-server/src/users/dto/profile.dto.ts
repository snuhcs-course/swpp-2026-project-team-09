/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Affiliation, User } from '../../generated/prisma/client.js';
import { accountProfileOf } from '../account-profile.js';

// The User's own. No other reply carries the 학번 or the registered name.
export interface ProfileDto {
  name: string;
  department: string;
  admissionYear: number | null;
  hashtags: string[];
  friendId: string;
  studentNumber: string | null;
  registeredName: string | null;
  affiliation: Affiliation | null;
  // Which of the name and the department the SNU account gives. Those it gives cannot be changed.
  fromAccount: { name: boolean; department: boolean };
}

export function toProfileDto(user: User): ProfileDto {
  const { name, department, admissionYear, hashtags, friendId, studentNumber, registeredName, affiliation } = user;
  const account = accountProfileOf(user.googleName);
  return {
    name,
    department,
    admissionYear,
    hashtags,
    friendId,
    studentNumber,
    registeredName,
    affiliation,
    fromAccount: { name: account.name !== null, department: account.department !== null },
  };
}

// The name the library knows: the registered name, or the name when the User left it empty.
export function registeredNameOf({ name, registeredName }: Pick<User, 'name' | 'registeredName'>): string {
  return registeredName ?? name;
}
