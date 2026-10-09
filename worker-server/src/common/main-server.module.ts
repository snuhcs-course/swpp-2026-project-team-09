/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Global, Module } from '@nestjs/common';
import { FETCH_MAIN_SERVER, MainServer } from './main-server.js';

// Global, so that every feature module can inject MainServer without importing this module.
@Global()
@Module({
  providers: [{ provide: FETCH_MAIN_SERVER, useValue: fetch }, MainServer],
  exports: [MainServer],
})
export class MainServerModule {}
