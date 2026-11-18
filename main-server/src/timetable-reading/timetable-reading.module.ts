/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ModelPortModule } from '../assistant/model-port.module.js';
import { CLOCK, systemClock } from '../quests/clock.js';
import { TimetableReadingController } from './timetable-reading.controller.js';
import { TimetableReadingService } from './timetable-reading.service.js';

// P15-52: reading a timetable screenshot with the AI's model.
@Module({
  imports: [ModelPortModule],
  controllers: [TimetableReadingController],
  providers: [TimetableReadingService, { provide: CLOCK, useValue: systemClock }],
})
export class TimetableReadingModule {}
