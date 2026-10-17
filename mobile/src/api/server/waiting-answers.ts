/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { FriendRequests, JoinRequest, QuestInvitation, QuestSummary } from '@/api/waiting-types';
import {
  field,
  hasTexts,
  isBoard,
  isEventName,
  isHolder,
  isJoinPolicy,
  isNumber,
  isUserSummary,
  listOf,
} from './answers';

// The checks of the main server's lists of what waits for the User.

function isReceivedRequest(value: unknown): value is FriendRequests['received'][number] {
  return hasTexts(value, ['id', 'sentAt']) && isUserSummary(field(value, 'sender'));
}

function isSentRequest(value: unknown): value is FriendRequests['sent'][number] {
  return hasTexts(value, ['id', 'sentAt']) && isUserSummary(field(value, 'receiver'));
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

// An invitation, and a request to join as its User lists it: the same shape.
export function isQuestWaiting(value: unknown): value is QuestInvitation {
  return hasTexts(value, ['id', 'sentAt']) && isQuestSummary(field(value, 'quest'));
}

export const isQuestInvitations = listOf(isQuestWaiting);

function isJoinRequest(value: unknown): value is JoinRequest {
  return hasTexts(value, ['id', 'sentAt']) && isHolder(field(value, 'user'));
}

export const isJoinRequests = listOf(isJoinRequest);
