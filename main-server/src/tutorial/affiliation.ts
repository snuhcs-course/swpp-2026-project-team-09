/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { User } from '../generated/prisma/client.js';

// The User's 소속 (`undergraduate | graduate | exchange`), or null when it is not given. P06 ticket 01 adds the field
// `affiliation` to User. Until it lands the field is missing, and only the admission year makes a User eligible by
// default; once it has landed this reads `user.affiliation`.
export function affiliationOf(user: User): string | null {
  const { affiliation } = user as User & { affiliation?: unknown };
  return typeof affiliation === 'string' ? affiliation : null;
}
