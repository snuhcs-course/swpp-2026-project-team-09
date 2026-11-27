/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { Prisma, User } from '../../generated/prisma/client.js';
import {
  HolderDto,
  HOLDER_SELECT,
  NextSubQuestDto,
  nextSubQuestOf,
  QUEST_INCLUDE,
  QUEST_SUMMARY_INCLUDE,
  QuestSummaryDto,
  toQuestSummaryDto,
} from './quest.dto.js';

export const askToJoinSchema = z.strictObject({ questId: z.uuid() });

export type AskToJoinDto = z.infer<typeof askToJoinSchema>;

// A request to join or an invitation as its User lists it, with the Quest as it is now.
export interface WaitingDto {
  id: string;
  quest: QuestSummaryDto;
  sentAt: string;
}

// An invitation as the invited User lists it, with when and where its Quest next meets, since a 비공개 파티's post
// cannot be read before entering. Null only for a Quest with no Sub Quest ahead, which the list leaves out.
export interface ReceivedInvitationDto extends WaitingDto {
  nextSubQuest: NextSubQuestDto | null;
  // The Leader who sent it, who may no longer lead the Quest; the Quest's Leader for one that kept no sender.
  invitedBy: HolderDto;
}

// A request to join or an invitation as the Leader lists it, with its User.
export interface WaitingUserDto {
  id: string;
  user: Pick<User, 'id' | 'name' | 'department'>;
  sentAt: string;
}

// A request to join as the Leader lists it: `removedBefore` when the Leader removed its User from the Quest before.
export interface JoinRequestUserDto extends WaitingUserDto {
  removedBefore: boolean;
}

// A Quest the Leader removed the User from, which the User comes back to only by asking to join.
export interface QuestRemovalDto {
  questId: string;
  removedAt: string;
}

export const WAITING_INCLUDE = {
  quest: { include: QUEST_SUMMARY_INCLUDE },
} satisfies Prisma.QuestJoinRequestInclude & Prisma.QuestInvitationInclude;

export const RECEIVED_INVITATION_INCLUDE = {
  quest: { include: { ...QUEST_SUMMARY_INCLUDE, subQuests: QUEST_INCLUDE.subQuests } },
  invitedBy: { select: HOLDER_SELECT },
} satisfies Prisma.QuestInvitationInclude;

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

export function toReceivedInvitationDto(
  invitation: Prisma.QuestInvitationGetPayload<{ include: typeof RECEIVED_INVITATION_INCLUDE }>,
  now: Date,
): ReceivedInvitationDto {
  return {
    ...toWaitingDto(invitation),
    nextSubQuest: nextSubQuestOf(invitation.quest, now),
    invitedBy: invitation.invitedBy ?? invitation.quest.leader,
  };
}

export function toWaitingUserDto(
  waiting:
    | Prisma.QuestJoinRequestGetPayload<{ include: typeof WAITING_USER_INCLUDE }>
    | Prisma.QuestInvitationGetPayload<{ include: typeof WAITING_USER_INCLUDE }>,
): WaitingUserDto {
  return { id: waiting.id, user: waiting.user, sentAt: waiting.sentAt.toISOString() };
}
