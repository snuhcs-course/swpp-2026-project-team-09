// AI-generated with Claude Opus 5.5, 2026-09-28, prompted by TaeHyun79, reviewed by fyoon46 in #2
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
