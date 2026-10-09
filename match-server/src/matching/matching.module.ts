// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #45 #48
import { Module } from '@nestjs/common';
import { Grouping } from './grouping.js';
import { HashtagGrouping } from './hashtag-grouping.js';
import { FETCH_MAIN_SERVER, MainServer } from './main-server.js';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { PlacementService } from './placement.service.js';
import { RoundService } from './round.service.js';

@Module({
  controllers: [MatchingController],
  providers: [
    MatchingService,
    RoundService,
    PlacementService,
    MainServer,
    { provide: FETCH_MAIN_SERVER, useValue: fetch },
    { provide: Grouping, useClass: HashtagGrouping },
  ],
})
export class MatchingModule {}
