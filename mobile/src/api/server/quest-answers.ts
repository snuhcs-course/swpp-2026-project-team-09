/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest, QuestMember } from '@/api/types';
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
    isNumber(field(value, 'waitingJoinRequests')) &&
    (field(value, 'members') === undefined || listOf(isQuestMember)(field(value, 'members')))
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
