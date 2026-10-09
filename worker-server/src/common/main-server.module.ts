// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by fyoon46, reviewed by fyoon46 in #31
import { Global, Module } from '@nestjs/common';
import { FETCH_MAIN_SERVER, MainServer } from './main-server.js';

// Global, so that every feature module can inject MainServer without importing this module.
@Global()
@Module({
  providers: [{ provide: FETCH_MAIN_SERVER, useValue: fetch }, MainServer],
  exports: [MainServer],
})
export class MainServerModule {}
