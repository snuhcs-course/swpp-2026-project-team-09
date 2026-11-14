/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { type Position } from '../common/geometry.js';
import { type AnswerReply, type PlanInput } from './dto/answer.dto.js';
import { EventsPlanService } from './events/events-plan.service.js';
import { MealPlanService } from './gathering/meal-plan.service.js';

// The answer of any kind of plan input, from the service of its kind.
@Injectable()
export class PlanAnswersService {
  constructor(
    private readonly meals: MealPlanService,
    private readonly events: EventsPlanService,
  ) {}

  plan(askerId: string, input: PlanInput, at: { now: Date; location: Position | null }): Promise<AnswerReply> {
    return input.kind === 'meal' ? this.meals.plan(askerId, input, at) : this.events.plan(askerId, input, at);
  }
}
