import { z } from 'zod';

const candidateSchema = z.strictObject({ userId: z.uuid(), globalEventId: z.uuid() });

// The match server's waiting requests, of which it asks which still stand.
export const standingQuestionSchema = z.strictObject({ requests: z.array(candidateSchema) });

export type StandingQuestionDto = z.infer<typeof standingQuestionSchema>;

export interface StandingAnswerDto {
  standing: z.infer<typeof candidateSchema>[];
}

// A match the match server formed, for which it asks for the Shared Quest.
export const matchQuestRequestSchema = z.strictObject({
  globalEventId: z.uuid(),
  userIds: z
    .array(z.uuid())
    .min(2)
    .max(4)
    .refine((userIds) => new Set(userIds).size === userIds.length, 'Each User is named once'),
});

export type MatchQuestRequestDto = z.infer<typeof matchQuestRequestSchema>;

export interface MatchQuestDto {
  questId: string;
  holderIds: string[];
}
