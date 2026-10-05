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

// A request to join as the Leader lists it.
export interface ReceivedJoinRequestDto {
  id: string;
  user: Pick<User, 'id' | 'name' | 'department'>;
  sentAt: string;
}

export const WAITING_INCLUDE = {
  quest: { include: QUEST_SUMMARY_INCLUDE },
} satisfies Prisma.QuestJoinRequestInclude & Prisma.QuestInvitationInclude;

export const RECEIVED_JOIN_REQUEST_INCLUDE = {
  user: { select: HOLDER_SELECT },
} satisfies Prisma.QuestJoinRequestInclude;

export function toWaitingDto(
  waiting:
    | Prisma.QuestJoinRequestGetPayload<{ include: typeof WAITING_INCLUDE }>
    | Prisma.QuestInvitationGetPayload<{ include: typeof WAITING_INCLUDE }>,
): WaitingDto {
  return { id: waiting.id, quest: toQuestSummaryDto(waiting.quest), sentAt: waiting.sentAt.toISOString() };
}

export function toReceivedJoinRequestDto(
  request: Prisma.QuestJoinRequestGetPayload<{ include: typeof RECEIVED_JOIN_REQUEST_INCLUDE }>,
): ReceivedJoinRequestDto {
  return { id: request.id, user: request.user, sentAt: request.sentAt.toISOString() };
}
