/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type {
  FriendRequests,
  JoinRequest,
  KeptNotification,
  MyJoinRequest,
  NextSubQuest,
  QuestInvitation,
  QuestRemoval,
  QuestSummary,
  RequestUser,
} from '@/api/waiting-types';
import {
  field,
  hasTexts,
  isBoard,
  isEventName,
  isHolder,
  isJoinPolicy,
  isNumber,
  isPlace,
  isTextOrNull,
  isUserSummary,
  listOf,
} from './answers';

// The checks of the main server's lists of what waits for the User.

function isRequestUser(value: unknown): value is RequestUser {
  const id = field(value, 'id');
  return isUserSummary(value) && (id === undefined || typeof id === 'string');
}

function isReceivedRequest(value: unknown): value is FriendRequests['received'][number] {
  return hasTexts(value, ['id', 'sentAt']) && isRequestUser(field(value, 'sender'));
}

function isSentRequest(value: unknown): value is FriendRequests['sent'][number] {
  return hasTexts(value, ['id', 'sentAt']) && isRequestUser(field(value, 'receiver'));
}

export function isFriendRequests(value: unknown): value is FriendRequests {
  return listOf(isReceivedRequest)(field(value, 'received')) && listOf(isSentRequest)(field(value, 'sent'));
}

export function isQuestSummary(value: unknown): value is QuestSummary {
  return (
    hasTexts(value, ['id', 'title', 'description', 'createdAt']) &&
    isEventName(field(value, 'globalEvent')) &&
    isHolder(field(value, 'leader')) &&
    isNumber(field(value, 'holderCount')) &&
    isNumber(field(value, 'capacity')) &&
    isJoinPolicy(field(value, 'joinPolicy')) &&
    isBoard(field(value, 'board'))
  );
}

// A request to join as its User lists it.
export function isMyJoinRequest(value: unknown): value is MyJoinRequest {
  return hasTexts(value, ['id', 'sentAt']) && isQuestSummary(field(value, 'quest'));
}

export const isMyJoinRequests = listOf(isMyJoinRequest);

export function isNextSubQuest(value: unknown): value is NextSubQuest {
  return (
    hasTexts(value, ['id', 'title']) &&
    isTextOrNull(field(value, 'startsAt')) &&
    isTextOrNull(field(value, 'endsAt')) &&
    isPlace(field(value, 'place'))
  );
}

// An invitation as its User lists it, with when and where its Quest next meets.
function isQuestInvitation(value: unknown): value is QuestInvitation {
  const next = field(value, 'nextSubQuest');
  return isMyJoinRequest(value) && (next === null || isNextSubQuest(next));
}

export const isQuestInvitations = listOf(isQuestInvitation);

function isJoinRequest(value: unknown): value is JoinRequest {
  const removedBefore = field(value, 'removedBefore');
  return (
    hasTexts(value, ['id', 'sentAt']) &&
    isHolder(field(value, 'user')) &&
    (removedBefore === undefined || typeof removedBefore === 'boolean')
  );
}

export const isJoinRequests = listOf(isJoinRequest);

function isQuestRemoval(value: unknown): value is QuestRemoval {
  return hasTexts(value, ['questId', 'removedAt']);
}

export const isQuestRemovals = listOf(isQuestRemoval);

function isKeptNotification(value: unknown): value is KeptNotification {
  const ahead = field(value, 'ahead');
  return hasTexts(value, ['id', 'kind', 'title', 'line', 'at', 'url']) && (ahead === undefined || isTextOrNull(ahead));
}

export const isKeptNotifications = listOf(isKeptNotification);
