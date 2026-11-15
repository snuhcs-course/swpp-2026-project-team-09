/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type MealPlanStage } from './meal-plan.js';
import { withAccessToken } from './sign-in.js';

// The answers drawn on the map as the Assistant's endpoint and the recalculation give them, for an app that draws
// events and recruiting Quests.

export const EVENTS_APP = { clientCapabilities: ['library', 'answer', 'events'] };

export const replySchema = z.object({ text: z.string(), answer: z.custom<AnswerReply | null>() });

export function answerIn(body: unknown): AnswerReply {
  const { answer } = replySchema.parse(body);
  if (answer === null) {
    throw new Error('The reply has no answer');
  }
  return answer;
}

// Each plan's lines as plain text.
export const texts = ({ plans }: AnswerReply): string[][] =>
  plans.map(({ lines }) => lines.map((line) => line.map(({ text }) => text).join('')));

export function recalculate(stage: MealPlanStage, input: object): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
    input,
    location: null,
  });
}

// The names of the tools the model was offered on its first call.
export const toolNames = (stage: MealPlanStage): string[] =>
  (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);
