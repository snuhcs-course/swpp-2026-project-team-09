/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { AssistantService } from './assistant.service.js';
import { type AnswerReply, type Recalculation, recalculationSchema } from './dto/answer.dto.js';
import {
  type AssistantMessages,
  assistantMessagesSchema,
  type AssistantReplyDto,
} from './dto/assistant-messages.dto.js';
import { outOfReach } from './free-time/tool-parts.js';
import { MealPlanService } from './gathering/meal-plan.service.js';

@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly mealPlans: MealPlanService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // The chat Assistant's reply to the conversation. It changes nothing, so a repeat only asks the model again.
  @Post('messages')
  @HttpCode(HttpStatus.OK)
  reply(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: assistantMessagesSchema }) { messages, clientCapabilities, context }: AssistantMessages,
  ): Promise<AssistantReplyDto> {
    if (context.conditions !== null && context.conditions.people[0]?.userId !== user.id) {
      throw new BadRequestException('The first person of a plan is the asker');
    }
    return this.assistant.reply(user.id, messages, clientCapabilities, context);
  }

  // A plan recalculated from its changed input, without the model and without counting the User's messages.
  @Post('answers')
  @HttpCode(HttpStatus.OK)
  recalculate(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: recalculationSchema }) { input, location }: Recalculation,
  ): Promise<AnswerReply> {
    const now = this.clock.now();
    if (outOfReach(input.date, now)) {
      throw new BadRequestException('A plan is for a day from today to a week ahead');
    }
    return this.mealPlans.plan(user.id, input, { now, location });
  }
}
