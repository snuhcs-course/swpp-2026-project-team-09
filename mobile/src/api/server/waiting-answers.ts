// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by fyoon46
import type { FriendRequests, JoinRequest, Meetup, Meetups, QuestInvitation, QuestSummary } from '@/api/waiting-types';
import {
  field,
  hasTexts,
  isBoard,
  isEventName,
  isHolder,
  isJoinPolicy,
  isNumber,
  isPlace,
  isText,
  isTextOrNull,
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

const MEETUP_STATES = new Set(['proposed', 'accepted', 'declined', 'withdrawn', 'expired']);

export function isMeetup(value: unknown): value is Meetup {
  const state = field(value, 'state');
  return (
    hasTexts(value, ['id', 'title', 'startsAt']) &&
    isTextOrNull(field(value, 'endsAt')) &&
    isPlace(field(value, 'place')) &&
    isText(state) &&
    MEETUP_STATES.has(state) &&
    isHolder(field(value, 'proposer')) &&
    isHolder(field(value, 'receiver'))
  );
}

export function isMeetups(value: unknown): value is Meetups {
  return listOf(isMeetup)(field(value, 'received')) && listOf(isMeetup)(field(value, 'sent'));
}

function isJoinRequest(value: unknown): value is JoinRequest {
  return hasTexts(value, ['id', 'sentAt']) && isHolder(field(value, 'user'));
}

export const isJoinRequests = listOf(isJoinRequest);
