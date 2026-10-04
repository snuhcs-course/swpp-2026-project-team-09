import { Module } from '@nestjs/common';
import { Grouping } from './grouping.js';
import { HashtagGrouping } from './hashtag-grouping.js';
import { FETCH_MAIN_SERVER, MainServer } from './main-server.js';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { RoundService } from './round.service.js';

@Module({
  controllers: [MatchingController],
  providers: [
    MatchingService,
    RoundService,
    MainServer,
    { provide: FETCH_MAIN_SERVER, useValue: fetch },
    { provide: Grouping, useClass: HashtagGrouping },
  ],
})
export class MatchingModule {}
