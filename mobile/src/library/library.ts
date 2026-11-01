/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { createLibraryClient, type LibraryClient } from './client';
import { HiddenViewTransport } from './hidden-transport';

// The app's one hidden web view transport, which the view at the app's root feeds, and the client over it.
export const hiddenTransport = new HiddenViewTransport();

export const library: LibraryClient = createLibraryClient(hiddenTransport);
