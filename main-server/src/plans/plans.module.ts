/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { AssistantModule } from '../assistant/assistant.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';

@Module({
  imports: [AssistantModule, QuestsModule],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
