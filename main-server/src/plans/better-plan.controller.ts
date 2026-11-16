/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { recalculationSchema } from '../assistant/dto/answer.dto.js';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type QuestDto } from '../quests/dto/quest.dto.js';
import { BetterPlanService } from './better-plan.service.js';
import { type BetterPlanDto } from './dto/better-plan.dto.js';
import { invitationCardQuerySchema } from './dto/invitation-card.dto.js';
import { type PlanQuestBody, planQuestSchema } from './dto/plan-quest.dto.js';

// Without a position, why the Leader's phone gave none, as the making's body says it.
const betterQuerySchema = invitationCardQuerySchema.extend({
  locationMissing: recalculationSchema.shape.locationMissing,
});

type BetterQuery = z.infer<typeof betterQuerySchema>;

@Controller('plans')
export class BetterPlanController {
  constructor(private readonly plans: BetterPlanService) {}

  // The query is where the Leader's phone is now, as the invitation's card takes it.
  @Get(':questId/better')
  better(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Query({ schema: betterQuerySchema }) { latitude, longitude, locationMissing }: BetterQuery,
  ): Promise<BetterPlanDto> {
    const location = latitude === undefined || longitude === undefined ? null : { latitude, longitude };
    return this.plans.better(user.id, questId, location, locationMissing);
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
