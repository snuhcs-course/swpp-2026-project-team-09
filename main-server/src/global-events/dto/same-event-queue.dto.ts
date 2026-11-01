/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import {
  type GlobalEventState,
  type SessionAttachment,
  type SessionHold,
  type Source,
} from '../../generated/prisma/client.js';
import { type Missing } from './global-event.dto.js';

// An event a queued session may be attached to, as it now is.
export interface QueueCandidateDto {
  id: string;
  title: string;
  startsAt: string | null;
  place: string | null;
  state: GlobalEventState;
}

// A session waiting for an Administrator, with its Draft. `reason` is what the AI said of it, when it was asked.
export interface QueuedSessionDto {
  sessionId: string;
  number: number;
  heldFor: SessionHold;
  reason: string | null;
  source: Source;
  key: string;
  address: string;
  draft: {
    id: string;
    version: number;
    title: string;
    startsAt: string | null;
    place: string | null;
    missing: Missing[];
  };
  candidates: QueueCandidateDto[];
}

// A session linked to an event, as the event's page lists them. Only one attached with what its Draft held can be detached.
export interface LinkedSessionDto {
  sessionId: string;
  number: number;
  source: Source;
  key: string;
  address: string;
  attachedBy: SessionAttachment;
  reason: string | null;
  detachable: boolean;
}

export const attachQueuedSchema = z.strictObject({
  // The version of the session's Draft that the Administrator saw.
  version: z.number().int().positive(),
  globalEventId: z.uuid(),
});

export type AttachQueuedDto = z.infer<typeof attachQueuedSchema>;
