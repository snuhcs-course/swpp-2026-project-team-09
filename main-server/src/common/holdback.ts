/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createHash } from 'node:crypto';

// Whether a User falls in a held-back share of the accounts (P07), so that what the Assistant learned can be told from
// habit: the first four bytes of the SHA-256 of their id, read as an unsigned number, modulo 100, below the percent.
// A User stays in or out for the same percent on every server and every day, and a larger percent holds back a
// superset of a smaller one's Users.
export function heldBack(userId: string, percent: number): boolean {
  return createHash('sha256').update(userId).digest().readUInt32BE(0) % 100 < percent;
}
