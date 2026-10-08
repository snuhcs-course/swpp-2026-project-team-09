import type { FriendRequests, JoinRequest, Meetup, Meetups, QuestInvitation } from '@/api/waiting-types';
import {
  field,
  hasTexts,
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

function isQuestInvitation(value: unknown): value is QuestInvitation {
  const quest = field(value, 'quest');
  return (
    hasTexts(value, ['id', 'sentAt']) &&
    hasTexts(quest, ['id', 'title']) &&
    isEventName(field(quest, 'globalEvent')) &&
    isHolder(field(quest, 'leader')) &&
    isNumber(field(quest, 'holderCount')) &&
    isNumber(field(quest, 'capacity')) &&
    isJoinPolicy(field(quest, 'joinPolicy'))
  );
}

export const isQuestInvitations = listOf(isQuestInvitation);

const MEETUP_STATES = new Set(['proposed', 'accepted', 'declined', 'withdrawn', 'expired']);

function isMeetup(value: unknown): value is Meetup {
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
