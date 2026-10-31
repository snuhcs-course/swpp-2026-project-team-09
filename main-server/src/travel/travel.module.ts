/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { SEED_DIRECTORY } from '../common/seed-directory.js';
import { readSeedTravel, TRAVEL_PROVIDER, type TravelProvider } from './travel.js';

// The walking table and the shuttle's times are read once, when the server starts.
@Module({
  providers: [{ provide: TRAVEL_PROVIDER, useFactory: (): Promise<TravelProvider> => readSeedTravel(SEED_DIRECTORY) }],
  exports: [TRAVEL_PROVIDER],
})
export class TravelModule {}
