import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { CLOCK, systemClock } from './clock.js';
import { QuestsController } from './quests.controller.js';
import { QuestsService } from './quests.service.js';

@Module({
  imports: [UsersModule],
  controllers: [QuestsController],
  providers: [QuestsService, { provide: CLOCK, useValue: systemClock }],
  exports: [QuestsService],
})
export class QuestsModule {}
