import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { CLOCK, systemClock } from './clock.js';
import { MatchingQuestsService } from './matching-quests.service.js';
import { QuestsController } from './quests.controller.js';
import { QuestsService } from './quests.service.js';

@Module({
  imports: [UsersModule],
  controllers: [QuestsController],
  providers: [QuestsService, MatchingQuestsService, { provide: CLOCK, useValue: systemClock }],
  exports: [QuestsService, MatchingQuestsService],
})
export class QuestsModule {}
