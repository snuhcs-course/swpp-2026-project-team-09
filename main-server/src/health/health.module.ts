/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
