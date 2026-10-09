/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Global, Module } from '@nestjs/common';
import { FETCH, PageFetcher } from './page-fetcher.js';

// Global, so that every feature module can inject a PageFetcher without importing this module.
@Global()
@Module({
  providers: [{ provide: FETCH, useValue: fetch }, PageFetcher],
  exports: [PageFetcher],
})
export class PageFetcherModule {}
