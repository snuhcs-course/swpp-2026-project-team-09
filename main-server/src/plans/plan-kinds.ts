/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, HttpStatus } from '@nestjs/common';
import {
  type EventsInput,
  type MealInput,
  type MeetInput,
  type PlanInput,
  type StudyInput,
} from '../assistant/dto/answer.dto.js';
import { isTogether } from '../assistant/lookup/study-group.js';

// Which Plans POST /plans makes into a Quest, and which it takes alone.

// A meal's Plan, a meet's, and a new recruiting Quest's are made into a Quest; the Quests to join are joined from their
// cards.
export function mealOrMeetInputOf(input: PlanInput): MealInput | MeetInput {
  if (input.kind !== 'meal' && input.kind !== 'meet') {
    throw new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      code: 'PLAN_KIND',
      message: "Only a meal's plan, a meet's, and a new recruiting Quest's are made into a Quest.",
    });
  }
  return input;
}

export type AloneInput = MealInput | MeetInput | StudyInput | EventsInput;

// A Plan taken alone: an events Plan, or a meal's, a meet's or a study's whose people are the asker only (a study's
// since P10 ticket 24). Null for a Plan with a Friend, for a study together, which is the group study room's request,
// and for any other kind.
export function aloneInputOf(input: PlanInput): AloneInput | null {
  if (input.kind === 'events') {
    return input;
  }
  if (input.kind === 'meal' || input.kind === 'meet') {
    return input.people.length < 2 ? input : null;
  }
  if (input.kind === 'study') {
    return isTogether(input) ? null : input;
  }
  return null;
}
