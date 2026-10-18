/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { NOTE_SET } from '@/api/mock/data/room-parts';
import type { Build } from './build';
import { pickFor } from './stable-pick';

// The mock adapter for the note a User writes with a request to join, which the Leader reads in the room. The mock
// build gives each request one of the frame's by its id; the server build gives none, so that a real request never
// carries invented words (P06 spec, Mocks). Replaced once the main server keeps a request's note.
export function noteOf(requestId: string, build: Build): string | null {
  return build === 'server' ? null : pickFor(requestId, NOTE_SET);
}
