// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #48
import { z } from 'zod';

const candidateSchema = z.strictObject({ userId: z.uuid(), globalEventId: z.uuid() });

// The match server's waiting requests, of which it asks which still stand.
export const standingQuestionSchema = z.strictObject({ requests: z.array(candidateSchema) });

export type StandingQuestionDto = z.infer<typeof standingQuestionSchema>;

export interface StandingAnswerDto {
  standing: z.infer<typeof candidateSchema>[];
}

const sizeSchema = z.int().min(2).max(4);

// The Global Events and sizes the match server has waiting requests for, whose eligible Quests it asks for.
export const eligibleQuestionSchema = z.strictObject({
  pools: z.array(z.strictObject({ globalEventId: z.uuid(), size: sizeSchema })),
});

export type EligibleQuestionDto = z.infer<typeof eligibleQuestionSchema>;

export interface EligibleAnswerDto {
  quests: {
    id: string;
    globalEventId: string;
    capacity: number;
    freePlaces: number;
    holderIds: string[];
    createdAt: string;
  }[];
}

// A waiting request the match server places into an eligible Quest.
export const placementSchema = z.strictObject({ questId: z.uuid(), userId: z.uuid(), size: sizeSchema });

export type PlacementDto = z.infer<typeof placementSchema>;

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
