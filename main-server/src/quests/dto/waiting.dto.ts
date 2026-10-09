/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { Prisma, User } from '../../generated/prisma/client.js';
import { HOLDER_SELECT, QUEST_SUMMARY_INCLUDE, QuestSummaryDto, toQuestSummaryDto } from './quest.dto.js';

export const askToJoinSchema = z.strictObject({ questId: z.uuid() });

export type AskToJoinDto = z.infer<typeof askToJoinSchema>;

// A request to join or an invitation as its User lists it, with the Quest as it is now.
export interface WaitingDto {
  id: string;
  quest: QuestSummaryDto;
  sentAt: string;
}

// A request to join or an invitation as the Leader lists it, with its User.
export interface WaitingUserDto {
  id: string;
  user: Pick<User, 'id' | 'name' | 'department'>;
  sentAt: string;
}

export const WAITING_INCLUDE = {
  quest: { include: QUEST_SUMMARY_INCLUDE },
} satisfies Prisma.QuestJoinRequestInclude & Prisma.QuestInvitationInclude;

export const WAITING_USER_INCLUDE = {
  user: { select: HOLDER_SELECT },
} satisfies Prisma.QuestJoinRequestInclude & Prisma.QuestInvitationInclude;

export function toWaitingDto(
  waiting:
    | Prisma.QuestJoinRequestGetPayload<{ include: typeof WAITING_INCLUDE }>
    | Prisma.QuestInvitationGetPayload<{ include: typeof WAITING_INCLUDE }>,
): WaitingDto {
  return { id: waiting.id, quest: toQuestSummaryDto(waiting.quest), sentAt: waiting.sentAt.toISOString() };
}

export function toWaitingUserDto(
  waiting:
    | Prisma.QuestJoinRequestGetPayload<{ include: typeof WAITING_USER_INCLUDE }>
    | Prisma.QuestInvitationGetPayload<{ include: typeof WAITING_USER_INCLUDE }>,
): WaitingUserDto {
  return { id: waiting.id, user: waiting.user, sentAt: waiting.sentAt.toISOString() };
}
