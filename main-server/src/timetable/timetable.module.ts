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
