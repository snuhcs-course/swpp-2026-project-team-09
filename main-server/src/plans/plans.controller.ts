/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Post } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type PlanQuestBody, type PlanQuestDto, planQuestSchema } from './dto/plan-quest.dto.js';
import { PlansService } from './plans.service.js';

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  // A Plan of the answer on screen made into a Quest with its invitations.
  @Post()
  @Idempotent({ required: true })
  make(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: planQuestSchema }) body: PlanQuestBody,
  ): Promise<PlanQuestDto> {
    return this.plans.make(user.id, body);
  }
}
