// AI-generated with Claude Opus 5.5, 2026-10-02 to 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #26 #31
import { Global, Module } from '@nestjs/common';
import { FETCH, PageFetcher } from './page-fetcher.js';

// Global, so that every feature module can inject a PageFetcher without importing this module.
@Global()
@Module({
  providers: [{ provide: FETCH, useValue: fetch }, PageFetcher],
  exports: [PageFetcher],
})
export class PageFetcherModule {}
