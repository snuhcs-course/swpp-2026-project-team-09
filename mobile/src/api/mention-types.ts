/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { RequestContext } from './assistant-types';

// A Friend picked with "@" in the AI input (main-server `assistant/dto/answer.dto.ts`, the same shape): the server
// takes them as exactly that Friend, never by the name.
export interface Mention {
  userId: string;
  name: string;
}

// The context of a request whose new message mentions Friends with "@". A request without one leaves the field out,
// which a server before it refuses.
export type MentionedContext = RequestContext & { mentions?: Mention[] };
