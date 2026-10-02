import { Global, Module } from '@nestjs/common';
import { FETCH, PageFetcher } from './page-fetcher.js';

// Global, so that every feature module can inject PageFetcher without importing this module.
@Global()
@Module({
  providers: [{ provide: FETCH, useValue: fetch }, PageFetcher],
  exports: [PageFetcher],
})
export class PageFetcherModule {}
