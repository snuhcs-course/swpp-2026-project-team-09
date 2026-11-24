/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { AsyncLocalStorage } from 'node:async_hooks';

// What is known of the request being handled (README.md: Logging). The guards fill in `userId`.
export interface RequestContextValues {
  reqId: string;
  userId?: string;
  startedAt: number;
}

// One storage for the process, imported where it is needed rather than injected: the logger is made before the Nest
// application. It depends on nothing of this server's, so the socket and worker servers can take it over.
export const requestContext = new AsyncLocalStorage<RequestContextValues>();

// Writes the signed-in User's or Administrator's ID on the request being handled, if any.
export function recordUserId(userId: string): void {
  const values = requestContext.getStore();
  if (values !== undefined) {
    values.userId = userId;
  }
}
