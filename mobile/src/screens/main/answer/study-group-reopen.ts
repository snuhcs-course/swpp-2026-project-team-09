/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Plan } from '@/api/assistant-types';
import { ApiError } from '@/api/errors';
import { roomRequests } from '@/api/room-requests';
import type { RoomRequestState } from '@/api/study-plan-types';
import type { Quest, QuestRoomRequest } from '@/api/types';
import { shownSubQuest } from '@/features/quests/adapter';
import { koreaClock, koreaDay } from '@/korea-time';
import { type RequestAnswer, requestAnswerOf } from '@/library/room-bookings';

// A booking party's room request shown again as the study answer it was sent from (P10 ticket 13; design
// group-study-resume 3 to 5): the party's address opens it, from the main server's rebuilt answer.

// The request the answer is shown again for: one still gathering or ready. A booked one is an ordinary Quest.
export function outRequestOf(quest: Quest): QuestRoomRequest | null {
  const request = quest.roomRequest ?? null;
  return request !== null && (request.status === 'gathering' || request.status === 'ready') ? request : null;
}

// "관정 그룹스터디룸 내일 15:00"
export function requestTitle(quest: Quest, now: Date): string {
  const start = shownSubQuest(quest)?.startsAt ?? null;
  return start === null ? '관정 그룹스터디룸' : `관정 그룹스터디룸 ${koreaDay(start, now)} ${koreaClock(start)}`;
}

function planWithRequest(plan: Plan, id: string): Plan {
  const group = plan.study?.group;
  if (plan.study === undefined || group === undefined) {
    return plan;
  }
  const request: RoomRequestState = {
    id,
    status: 'gathering',
    consented: 0,
    asked: group.people - 1,
    waiting: [],
    moreNeeded: 0,
  };
  return { ...plan, study: { ...plan.study, group: { ...group, request } } };
}

// The kept answer bound to its request, whose state the card reads itself.
function withRequest({ requestId, answer }: RequestAnswer): AnswerReply {
  return { ...answer, plans: answer.plans.map((plan) => planWithRequest(plan, requestId)) };
}

// The server's rebuilt answer, or on a main server before the route the one this phone kept when it sent the request.
export async function requestAnswer(questId: string, requestId: string): Promise<AnswerReply> {
  try {
    return await roomRequests.answer(requestId);
  } catch (error) {
    const kept = error instanceof ApiError && error.status === 404 ? await requestAnswerOf(questId) : null;
    if (kept?.requestId !== requestId) {
      throw error;
    }
    return withRequest(kept);
  }
}
