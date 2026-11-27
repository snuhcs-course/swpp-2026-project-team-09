/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { isRoomRequestStatus } from '@/api/room-requests';
import type { Quest, QuestMember, QuestRoomRequest } from '@/api/types';
import {
  field,
  hasTexts,
  isBoard,
  isEventName,
  isHolder,
  isJoinPolicy,
  isNumber,
  isSubQuest,
  isText,
  isTextOrNull,
  listOf,
} from './answers';

// The checks of a Quest the User holds. A Quest without `members` comes from a main server before members.

export function isQuest(value: unknown): value is Quest {
  const leader = field(value, 'leader');
  return (
    isBoard(field(value, 'board')) &&
    isText(field(value, 'description')) &&
    isTextOrNull(field(value, 'createdAt')) &&
    hasTexts(value, ['id', 'title']) &&
    isEventName(field(value, 'globalEvent')) &&
    (leader === null || isHolder(leader)) &&
    isNumber(field(value, 'capacity')) &&
    isJoinPolicy(field(value, 'joinPolicy')) &&
    listOf(isHolder)(field(value, 'holders')) &&
    listOf(isSubQuest)(field(value, 'subQuests')) &&
    typeof field(value, 'classQuest') === 'boolean' &&
    ['boolean', 'undefined'].includes(typeof field(value, 'takenAlone')) &&
    isNumber(field(value, 'waitingJoinRequests')) &&
    (field(value, 'members') === undefined || listOf(isQuestMember)(field(value, 'members'))) &&
    isRoomRequestOrNone(field(value, 'roomRequest'))
  );
}

// Absent from a main server before it.
function isRoomRequestOrNone(value: unknown): value is QuestRoomRequest | null | undefined {
  return (
    value === undefined ||
    value === null ||
    (isText(field(value, 'id')) &&
      isRoomRequestStatus(field(value, 'status')) &&
      isNumber(field(value, 'consented')) &&
      isNumber(field(value, 'asked')))
  );
}

function isQuestMember(value: unknown): value is QuestMember {
  const state = field(value, 'state');
  const lateMinutes = field(value, 'lateMinutes');
  return (
    isHolder(field(value, 'user')) &&
    (state === 'invited' || state === 'accepted' || state === 'late' || state === 'declined') &&
    (lateMinutes === null || isNumber(lateMinutes))
  );
}

export const isQuests = listOf(isQuest);
