/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Choice } from './assistant-types';

// --- The words the User taught the Assistant (/assistant/aliases) ---

// Words the User taught the Assistant by choosing what they meant, as the main server keeps them, and the Place,
// Friend or event they mean now, by id and name. A Friend who is no Friend any more is named "친구". `uses` counts
// the choices and answers it took part in, `lastUsedAt` is the latest of them.
export interface TaughtAlias {
  id: string;
  kind: Choice['kind'];
  words: string;
  target: { id: string; label: string };
  uses: number;
  lastUsedAt: string;
}

// 아니에요 under an answer: the words did not mean that Place, Friend or event.
export interface AliasRejection {
  kind: Choice['kind'];
  words: string;
  targetId: string;
}
