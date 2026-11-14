/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { planInputSchema, recalculationSchema } from '../../assistant/dto/answer.dto.js';
import { type QuestDto } from '../../quests/dto/quest.dto.js';

const PLAN_ID_MAX = 200;

// The conditions of the answer on screen and the Plan it shows, declared with the same shape in the app's
// plan-quest-types.ts. Nothing else of the Plan is taken from the app.
export const planQuestSchema = z.strictObject({
  input: planInputSchema,
  planId: z.string().min(1).max(PLAN_ID_MAX),
  startAt: z.iso.datetime({ offset: true }),
  location: recalculationSchema.shape.location,
});

export type PlanQuestBody = z.infer<typeof planQuestSchema>;

export interface PlanQuestDto {
  // As the asker reads any Quest they hold.
  quest: QuestDto;
  // One for each Friend of the Plan, in the Plan's order.
  invitations: { id: string; userId: string }[];
}
