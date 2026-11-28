/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { asksMainServer } from '@/api/servers';
import { mockLibraryTransport } from '@/api/mock/library-transport';
import { createLibraryClient, type LibraryClient } from './client';
import { markLibraryLoggedIn } from './flag';
import { HiddenViewTransport } from './hidden-transport';

// The app's one hidden web view transport, which the view at the app's root feeds, and the client over it.
export const hiddenTransport = new HiddenViewTransport();

// The mock build keeps its bookings on the phone and starts logged in (A04 ticket 11); the tests bring a fake library
// of their own through the hidden view, so they never use it.
const MOCK_BOOKINGS = !asksMainServer() && process.env.NODE_ENV !== 'test';
if (MOCK_BOOKINGS) {
  void markLibraryLoggedIn();
}

export const library: LibraryClient = createLibraryClient(
  MOCK_BOOKINGS ? mockLibraryTransport(hiddenTransport) : hiddenTransport,
);
