// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #6
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
