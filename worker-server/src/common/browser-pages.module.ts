/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Global, Module } from '@nestjs/common';
import { BrowserPages, LAUNCH_BROWSER } from './browser-pages.js';
import { launchChromium } from './chromium.js';

// Global, as PageFetcherModule is, so that a feature module can inject BrowserPages without importing this module.
@Global()
@Module({
  providers: [{ provide: LAUNCH_BROWSER, useValue: launchChromium }, BrowserPages],
  exports: [BrowserPages],
})
export class BrowserPagesModule {}
