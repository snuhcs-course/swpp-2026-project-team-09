import { Global, Module } from '@nestjs/common';
import { SignalsService } from './signals.service.js';

// Global, so that every feature module can inject SignalsService without importing this module.
@Global()
@Module({
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
