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
import { NewQuestPlanService } from './recruiting/new-quest-plan.service.js';
import { QuestsPlanService } from './recruiting/quests-plan.service.js';

// The answer of any kind of plan input, from the service of its kind, which the chat's tools call too.
@Injectable()
export class PlanAnswersService {
  constructor(
    readonly meals: MealPlanService,
    readonly events: EventsPlanService,
    readonly quests: QuestsPlanService,
    readonly newQuests: NewQuestPlanService,
  ) {}

  plan(askerId: string, input: PlanInput, at: { now: Date; location: Position | null }): Promise<AnswerReply> {
    if (input.kind === 'meal') {
      return this.meals.plan(askerId, input, at);
    }
    if (input.kind === 'events') {
      return this.events.plan(askerId, input, at);
    }
    return input.kind === 'quests' ? this.quests.plan(askerId, input, at) : this.newQuests.plan(askerId, input, at);
  }
}
