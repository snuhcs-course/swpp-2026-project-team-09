import { Module } from '@nestjs/common';
import { TimetableModule } from '../timetable/timetable.module.js';
import { UsersModule } from '../users/users.module.js';
import { ClassQuestsService } from './class-quests.service.js';
import { CLOCK, systemClock } from './clock.js';
import { QuestsController } from './quests.controller.js';
import { QuestsService } from './quests.service.js';

@Module({
  imports: [UsersModule, TimetableModule],
  controllers: [QuestsController],
  providers: [QuestsService, ClassQuestsService, { provide: CLOCK, useValue: systemClock }],
  exports: [QuestsService],
})
export class QuestsModule {}
