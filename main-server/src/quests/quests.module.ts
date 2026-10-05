import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { CLOCK, systemClock } from './clock.js';
import { MatchingQuestsService } from './matching-quests.service.js';
import { QuestsController } from './quests.controller.js';
import { QuestsService } from './quests.service.js';
import { RecruitingService } from './recruiting.service.js';
import { SubQuestsService } from './sub-quests.service.js';

@Module({
  imports: [UsersModule],
  controllers: [QuestsController],
  providers: [
    QuestsService,
    SubQuestsService,
    RecruitingService,
    MatchingQuestsService,
    { provide: CLOCK, useValue: systemClock },
  ],
  exports: [QuestsService, RecruitingService, MatchingQuestsService],
})
export class QuestsModule {}
