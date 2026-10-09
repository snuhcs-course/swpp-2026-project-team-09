// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #37
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { TimetableController } from './timetable.controller.js';
import { TimetableService } from './timetable.service.js';

@Module({
  imports: [UsersModule],
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
