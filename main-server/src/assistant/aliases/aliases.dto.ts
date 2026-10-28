/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AliasKind } from './personal-aliases.js';

// An alias the User taught, as 내가 가르친 말 lists it: the words, normalised, and the target by id and name. A Friend
// who is no Friend any more is named 친구 and nothing more, and a Place the catalog no longer has 장소.
export interface AliasDto {
  id: string;
  kind: AliasKind;
  words: string;
  target: { id: string; label: string };
  // How many times the User chose the target for the words.
  uses: number;
  lastUsedAt: string;
}

export interface AliasesDto {
  aliases: AliasDto[];
}

// 아니에요 under an answer read from an alias: its kind, words and target, as the reply's resolvedBy gave them.
export const aliasRejectionSchema = z.strictObject({
  kind: z.enum(['place', 'friend'] satisfies AliasKind[]),
  words: z.string().trim().min(1).max(50),
  targetId: z.uuid(),
});

export type AliasRejection = z.infer<typeof aliasRejectionSchema>;
