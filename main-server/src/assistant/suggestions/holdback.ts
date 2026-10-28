/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createHash } from 'node:crypto';

// Whether an account is held back: the first four bytes of the SHA-256 of its id, modulo 100, fall under the share.
// The same account stays on the same side whatever the server or the day.
export function heldBack(userId: string, percent: number): boolean {
  return createHash('sha256').update(userId).digest().readUInt32BE(0) % 100 < percent;
}
