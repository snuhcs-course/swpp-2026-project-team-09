import type { ApiClient } from '@/api/client';
import type { RecruitingQuest } from '@/api/party-types';
import { field, isNothing, isPlace, isQuest, hasTexts, isTextOrNull, listOf } from './answers';
import { isQuestInvitations, isQuestSummary, isQuestWaiting } from './waiting-answers';
import { call } from './http';

// The operations of the 파티 tab, each from its route of the main server.

function isNextSubQuest(value: unknown): value is RecruitingQuest['nextSubQuest'] {
  return (
    hasTexts(value, ['id', 'title']) &&
    isTextOrNull(field(value, 'startsAt')) &&
    isTextOrNull(field(value, 'endsAt')) &&
    isPlace(field(value, 'place'))
  );
}

function isRecruitingQuest(value: unknown): value is RecruitingQuest {
  return isQuestSummary(value) && isNextSubQuest(field(value, 'nextSubQuest'));
}

function path(...parts: string[]): string {
  return parts.map((part) => `/${encodeURIComponent(part)}`).join('');
}

type PartyClient = Pick<
  ApiClient,
  | 'listRecruitingQuests'
  | 'joinQuest'
  | 'askToJoinQuest'
  | 'listMyJoinRequests'
  | 'withdrawJoinRequest'
  | 'makeQuest'
  | 'changeQuest'
  | 'inviteToQuest'
  | 'acceptInvitation'
  | 'declineInvitation'
>;

export const partyClient: PartyClient = {
  listRecruitingQuests: (board) =>
    call('GET', '/quests/recruiting', listOf(isRecruitingQuest), board === undefined ? {} : { query: { board } }),
  joinQuest: (questId) => call('POST', path('quests', questId, 'join'), isQuest),
  askToJoinQuest: async (questId) => {
    await call('POST', '/quest-join-requests', isQuestWaiting, { body: { questId } });
  },
  listMyJoinRequests: () => call('GET', '/quest-join-requests', isQuestInvitations),
  withdrawJoinRequest: async (requestId) => {
    await call('POST', path('quest-join-requests', requestId, 'withdraw'), isNothing);
  },
  makeQuest: (making, idempotencyKey) =>
    call('POST', '/quests/own', isQuest, { body: making, headers: { 'Idempotency-Key': idempotencyKey } }),
  changeQuest: (questId, change) => call('PATCH', path('quests', questId), isQuest, { body: change }),
  inviteToQuest: async (questId, userId) => {
    await call('POST', path('quests', questId, 'invitations'), isNothing, { body: { userId } });
  },
  acceptInvitation: (invitationId) => call('POST', path('quest-invitations', invitationId, 'accept'), isQuest),
  declineInvitation: async (invitationId) => {
    await call('POST', path('quest-invitations', invitationId, 'decline'), isNothing);
  },
};
