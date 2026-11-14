/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { AssistantModule } from '../assistant/assistant.module.js';
import { PlacesModule } from '../places/places.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { TravelModule } from '../travel/travel.module.js';
import { BetterPlanController } from './better-plan.controller.js';
import { BetterPlanService } from './better-plan.service.js';
import { InvitationCardController } from './invitation-card.controller.js';
import { InvitationCardService } from './invitation-card.service.js';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';

@Module({
  imports: [AssistantModule, PlacesModule, QuestsModule, TravelModule],
  controllers: [PlansController, InvitationCardController, BetterPlanController],
  providers: [PlansService, InvitationCardService, BetterPlanService],
})
export class PlansModule {}
