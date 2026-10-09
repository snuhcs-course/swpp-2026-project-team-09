/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Global, Module } from '@nestjs/common';
import { CampusBoundary, readCampusBoundary } from './campus-boundary.js';
import { SEED_DIRECTORY } from './seed-directory.js';

// Global, so that every feature module can inject CampusBoundary without importing this module. Its file is read once,
// when the server starts.
@Global()
@Module({
  providers: [
    { provide: CampusBoundary, useFactory: (): Promise<CampusBoundary> => readCampusBoundary(SEED_DIRECTORY) },
  ],
  exports: [CampusBoundary],
})
export class CampusBoundaryModule {}
