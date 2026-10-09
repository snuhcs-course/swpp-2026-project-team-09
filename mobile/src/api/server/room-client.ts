// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
import type { ApiClient } from '@/api/client';
import type { PlaceAt } from '@/api/room-types';
import { field, isCampusPlace, isMyParty, isNothing, isQuest, isSubQuest } from './answers';
import { isJoinRequests } from './waiting-answers';
import { call } from './http';

// The operations of a Quest's room, each from its route of the main server.

function isPlaceAt(value: unknown): value is PlaceAt {
  const relation = field(value, 'relation');
  const place = field(value, 'place');
  return relation === 'none' ? place === null : (relation === 'inside' || relation === 'near') && isCampusPlace(place);
}

function questPath(questId: string, rest = ''): string {
  return `/quests/${encodeURIComponent(questId)}${rest}`;
}

function subQuestPath(questId: string, subQuestId: string, rest = ''): string {
  return questPath(questId, `/sub-quests/${encodeURIComponent(subQuestId)}${rest}`);
}

async function send(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<void> {
  await call(method, path, isNothing, body === undefined ? {} : { body });
}

type RoomClient = Pick<
  ApiClient,
  | 'getQuest'
  | 'dropQuest'
  | 'addSubQuest'
  | 'editSubQuest'
  | 'cancelSubQuest'
  | 'markSubQuestDone'
  | 'unmarkSubQuestDone'
  | 'handOverQuest'
  | 'removeHolder'
  | 'endQuest'
  | 'acceptJoinRequest'
  | 'declineJoinRequest'
  | 'listSentInvitations'
  | 'cancelInvitation'
  | 'openParty'
  | 'joinParty'
  | 'leaveParty'
  | 'setPartySharing'
  | 'removePartyMember'
  | 'endParty'
  | 'findPlaceAt'
>;

export const roomClient: RoomClient = {
  getQuest: (questId) => call('GET', questPath(questId), isQuest),
  dropQuest: (questId) => send('DELETE', questPath(questId)),
  addSubQuest: (questId, content, idempotencyKey) =>
    call('POST', questPath(questId, '/sub-quests'), isSubQuest, {
      body: content,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  editSubQuest: (questId, subQuestId, content) =>
    call('PUT', subQuestPath(questId, subQuestId), isSubQuest, { body: content }),
  cancelSubQuest: (questId, subQuestId) => send('DELETE', subQuestPath(questId, subQuestId)),
  markSubQuestDone: (questId, subQuestId) => send('POST', subQuestPath(questId, subQuestId, '/done')),
  unmarkSubQuestDone: (questId, subQuestId) => send('DELETE', subQuestPath(questId, subQuestId, '/done')),
  handOverQuest: (questId, userId) => send('PUT', questPath(questId, '/leader'), { userId }),
  removeHolder: (questId, userId) => send('DELETE', questPath(questId, `/holders/${encodeURIComponent(userId)}`)),
  endQuest: (questId) => send('POST', questPath(questId, '/end')),
  acceptJoinRequest: (questId, requestId) =>
    send('POST', questPath(questId, `/join-requests/${encodeURIComponent(requestId)}/accept`)),
  declineJoinRequest: (questId, requestId) =>
    send('POST', questPath(questId, `/join-requests/${encodeURIComponent(requestId)}/decline`)),
  listSentInvitations: (questId) => call('GET', questPath(questId, '/invitations'), isJoinRequests),
  cancelInvitation: (questId, invitationId) =>
    send('DELETE', questPath(questId, `/invitations/${encodeURIComponent(invitationId)}`)),
  openParty: (opening) => call('POST', '/parties', isMyParty, { body: opening }),
  joinParty: (partyId) => call('POST', `/parties/${encodeURIComponent(partyId)}/join`, isMyParty),
  leaveParty: () => send('POST', '/parties/mine/leave'),
  setPartySharing: (on) => send('PUT', '/parties/mine/sharing', { on }),
  removePartyMember: (userId) => send('DELETE', `/parties/mine/members/${encodeURIComponent(userId)}`),
  endParty: () => send('POST', '/parties/mine/end'),
  findPlaceAt: ({ latitude, longitude }) => call('GET', '/places/at', isPlaceAt, { query: { latitude, longitude } }),
};
