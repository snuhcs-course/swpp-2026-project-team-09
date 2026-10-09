/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Global, Module } from '@nestjs/common';
import { SignalsService } from './signals.service.js';

// Global, so that every feature module can inject SignalsService without importing this module.
@Global()
@Module({
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
