/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Plan } from '@/api/assistant-types';
import type { RoomRequest, RoomRequestCompanion } from '@/api/room-requests';
import type { StudyGroup } from '@/api/study-plan-types';
import { MORE_FRIENDS, type PartyCard } from '../library/room-party';

// The study answer together's room request (P10 ticket 12), today's run behind its card: what it is made from, and what
// the card says while it is out.

// The request's card: the group's key, the Friends of the answer after the asker by the names its parts give, and the
// study input, which the server keeps to give the answer back.
export function partyCardOf(answer: AnswerReply, plan: Plan, group: StudyGroup): PartyCard {
  const names = new Map(plan.parts.map(({ userId, name }) => [userId, name]));
  const friends = answer.input.kind === 'study' ? answer.input.people.slice(1) : [];
  return {
    key: group.key ?? '',
    questId: null,
    companions: friends.map(({ userId }) => ({ friendId: userId, name: names.get(userId) ?? '' })),
    ...(answer.input.kind === 'study' ? { input: answer.input } : {}),
  };
}

// The companions as they stand, from a server older than `companions` read from the consents.
function companionsOf(request: RoomRequest): RoomRequestCompanion[] {
  return (
    request.companions ??
    request.consents.map(({ userId, name, consented }) => ({
      userId,
      name,
      state: consented === null ? 'asked' : consented ? 'consented' : 'declined',
    }))
  );
}

// The companions still in: asked or consented.
function inRequest(request: RoomRequest): RoomRequestCompanion[] {
  return companionsOf(request).filter(({ state }) => state === 'asked' || state === 'consented');
}

// "동의 0/3 · 다 받으면 알려 드려요. 닫아도 돼요." right after it is sent, "동의 1/3 · 박민수, 이서연 님을 기다려요" once one is
// in, "모두 동의했어요" when every one is. The asker is not counted.
export function consentWords(request: RoomRequest): string {
  const still = inRequest(request);
  const consented = still.filter(({ state }) => state === 'consented').length;
  if (request.status === 'ready') {
    return '모두 동의했어요';
  }
  const of = `동의 ${String(consented)}/${String(still.length)}`;
  if (consented === 0) {
    return `${of} · 다 받으면 알려 드려요. 닫아도 돼요.`;
  }
  const waiting = still.filter(({ state }) => state === 'asked').map(({ name }) => name);
  // Everyone still in has consented and only the room's minimum is short, as the room card says it.
  return waiting.length === 0 ? `${of} · ${MORE_FRIENDS}` : `${of} · ${waiting.join(', ')} 님을 기다려요`;
}

const PEOPLE = ['', '한 명', '두 명', '세 명', '네 명'];
const MORE = ['', '한 명만', '두 명', '세 명'];

const peopleWords = (count: number): string => PEOPLE[count] ?? `${String(count)}명`;

// "박민수 님이 빠져서 세 명이에요. 한 명만 더 부르면 돼요." while a Friend is out and the room needs more; null otherwise.
export function outWords(request: RoomRequest): string | null {
  const more = request.moreNeeded ?? 0;
  const out = companionsOf(request).find(({ state }) => state === 'declined' || state === 'unanswered');
  if (more === 0 || out === undefined) {
    return null;
  }
  const people = inRequest(request).length + 1;
  return `${out.name} 님이 빠져서 ${peopleWords(people)}이에요. ${MORE[more] ?? `${String(more)}명`} 더 부르면 돼요.`;
}

// The group as the card shows it while the request is out: its people those still in, and the room's need of more.
export function groupOfRequest(group: StudyGroup, request: RoomRequest | null): StudyGroup {
  if (request === null) {
    return group;
  }
  return { ...group, people: inRequest(request).length + 1, moreNeeded: request.moreNeeded ?? 0 };
}

// Whether the request is out: gathering or ready, its people, time and room held.
export function isOut(request: RoomRequest | null): request is RoomRequest {
  return request !== null && (request.status === 'gathering' || request.status === 'ready');
}
