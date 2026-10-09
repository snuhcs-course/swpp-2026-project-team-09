// AI-generated with Claude Fable 5.1, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #38
import { Global, Module } from '@nestjs/common';
import { SignalsService } from './signals.service.js';

// Global, so that every feature module can inject SignalsService without importing this module.
@Global()
@Module({
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
