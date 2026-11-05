/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { SuggestionOutcome } from '../../../generated/prisma/client.js';
import { type QuestProposal } from '../../proposal.js';

const OPEN_EVENT = 'globalEvent:';

// Where the chat was opened from, and the card open there, `globalEvent:<id>`, if any.
export const suggestionQuerySchema = z.object({
  screen: z.enum(['main', 'events', 'party']),
  openCard: z
    .string()
    .startsWith(OPEN_EVENT)
    .transform((card) => card.slice(OPEN_EVENT.length))
    .pipe(z.uuid())
    .optional(),
});

export type SuggestionQuery = z.infer<typeof suggestionQuerySchema>;

// What the User did with a suggestion: a tap, ×, or 만들기 on its Proposal, which names the Quest it made.
export const suggestionOutcomeSchema = z.discriminatedUnion('outcome', [
  z.strictObject({ outcome: z.literal(SuggestionOutcome.accepted) }),
  z.strictObject({ outcome: z.literal(SuggestionOutcome.dismissed) }),
  z.strictObject({ outcome: z.literal(SuggestionOutcome.confirmed), questId: z.uuid() }),
]);

export type SuggestionOutcomeDto = z.infer<typeof suggestionOutcomeSchema>;

// What a tap runs, without the model: the Proposal card, or the walking route to a Place.
export type SuggestionActionDto =
  { type: 'proposal'; proposal: QuestProposal } | { type: 'route'; placeId: string; name: string };

// `id` is the impression's, which the outcome names.
export interface SuggestionDto {
  id: string;
  text: string;
  reason: string;
  action: SuggestionActionDto;
}

export interface SuggestionAnswerDto {
  suggestion: SuggestionDto | null;
}
