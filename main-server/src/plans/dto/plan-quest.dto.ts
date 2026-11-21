/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerLine, planInputSchema, recalculationSchema } from '../../assistant/dto/answer.dto.js';
import { type AskLevelDto } from '../../friends/dto/friends.dto.js';
import { type QuestDto } from '../../quests/dto/quest.dto.js';

const PLAN_ID_MAX = 200;

// The conditions of the answer on screen and the Plan it shows, declared with the same shape in the app's
// plan-quest-types.ts. Nothing else of the Plan is taken from the app.
export const planQuestSchema = z.strictObject({
  input: planInputSchema,
  planId: z.string().min(1).max(PLAN_ID_MAX),
  startAt: z.iso.datetime({ offset: true }),
  location: recalculationSchema.shape.location,
  // Why `location` is null; an app before P02-13 sends none.
  locationMissing: recalculationSchema.shape.locationMissing,
  // `plan-set`: a second meeting or shared meal is refused with 409, as the app words it.
  clientCapabilities: recalculationSchema.shape.clientCapabilities,
});

export type PlanQuestBody = z.infer<typeof planQuestSchema>;

export interface PlanQuestDto {
  // As the asker reads any Quest they hold.
  quest: QuestDto;
  // One for each Friend of the Plan, in the Plan's order.
  invitations: { id: string; userId: string }[];
  // The Friends of the Plan whom the asker was not yet asked about after a Plan became a Quest, in the Plan's order,
  // for the app to ask how much each usually sees.
  askLevels: AskLevelDto[];
  // A Plan taken alone ("여기로"), whose Quest the asker holds alone: the card's two lines, where the User goes and
  // whether they will be told when to leave, and when that leave-by rings, null for none. Absent for a Plan with a
  // Friend.
  alone?: { lines: AnswerLine[]; remindAt: string | null };
}
