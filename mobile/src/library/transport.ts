/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibraryErrorKind } from './call-script';
import type { LibraryEndpoint } from './site';

// What one call to the library came back with: the parsed JSON, or an error kind. Never the raw reply.
export type TransportReply = { ok: true; result: unknown } | { ok: false; error: LibraryErrorKind };

// How the library client reaches the site. The hidden web view is the app's one implementation
// (`hidden-transport.ts`); the tests use a fake one backed by the fake library.
export interface LibraryTransport {
  call: (endpoint: LibraryEndpoint, body: Readonly<Record<string, string>>) => Promise<TransportReply>;
  // Loads the site's logout URL in the hidden view. True when the page loaded in time; a failure is false, never a
  // throw, because the logout goes on with the cookies either way.
  logout: () => Promise<boolean>;
}
