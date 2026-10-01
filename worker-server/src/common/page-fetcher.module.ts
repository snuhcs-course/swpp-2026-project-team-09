import { Global, Module } from '@nestjs/common';
import { FETCH, PageFetcher } from './page-fetcher.js';

// Global, so that every collector shares the one PageFetcher.
@Global()
@Module({
  providers: [{ provide: FETCH, useValue: fetch }, PageFetcher],
  exports: [PageFetcher],
})
export class PageFetcherModule {}
