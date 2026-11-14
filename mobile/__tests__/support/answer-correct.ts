/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { FakeServer } from './fake-server';

// Correcting the answer on the map (P02 ticket 03), against the fake main server with the switch on.

// The bodies of the recalculations the app asked for, in order.
export function recalculations(server: FakeServer): unknown[] {
  return server.received('POST /assistant/answers').map(({ body }) => body);
}
