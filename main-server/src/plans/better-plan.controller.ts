/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type QuestDto } from '../quests/dto/quest.dto.js';
import { BetterPlanService } from './better-plan.service.js';
import { type BetterPlanDto } from './dto/better-plan.dto.js';
import { type InvitationCardQuery, invitationCardQuerySchema } from './dto/invitation-card.dto.js';
import { type PlanQuestBody, planQuestSchema } from './dto/plan-quest.dto.js';

@Controller('plans')
export class BetterPlanController {
  constructor(private readonly plans: BetterPlanService) {}

  // The query is where the Leader's phone is now, as the invitation's card takes it.
  @Get(':questId/better')
  better(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Query({ schema: invitationCardQuerySchema }) { latitude, longitude }: InvitationCardQuery,
  ): Promise<BetterPlanDto> {
    const location = latitude === undefined || longitude === undefined ? null : { latitude, longitude };
    return this.plans.better(user.id, questId, location);
  }

  @Put(':questId')
  change(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Body({ schema: planQuestSchema }) body: PlanQuestBody,
  ): Promise<QuestDto> {
    return this.plans.change(user.id, questId, body);
  }
}
