// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #45 #48
import { Module } from '@nestjs/common';
import { QuestsModule } from '../quests/quests.module.js';
import { UsersModule } from '../users/users.module.js';
import { FETCH_MATCH_SERVER, MatchServer } from './match-server.js';
import { MatchesController } from './matches.controller.js';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';

@Module({
  imports: [QuestsModule, UsersModule],
  controllers: [MatchingController, MatchesController],
  providers: [MatchingService, MatchServer, { provide: FETCH_MATCH_SERVER, useValue: fetch }],
})
export class MatchingModule {}
