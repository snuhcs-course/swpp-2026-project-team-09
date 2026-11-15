/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import type { CompanionState, RoomRequest, RoomRequestCompanion } from '@/api/room-requests';

// What the booker's room card shows of a room request's companions (P05 ticket 06): a line for each state, how many
// more people the room's minimum needs, and whether one more Friend may be asked.

export const ASK_FAILED = '친구를 부르지 못했어요. 다시 해 주세요.';

const ORDER: readonly CompanionState[] = ['consented', 'asked', 'declined', 'unanswered'];

const WORDS: Record<CompanionState, (names: string) => string> = {
  consented: (names) => `${names}이 동의했어요`,
  asked: (names) => `${names}의 답을 기다리고 있어요`,
  declined: (names) => `${names}은 못 와요`,
  unanswered: (names) => `${names}은 답이 없어요`,
};

function isIn({ state }: RoomRequestCompanion): boolean {
  return state === 'asked' || state === 'consented';
}

// "김민준님, 이서준님이 동의했어요": one line for each state any companion is in.
export function companionLines(companions: readonly RoomRequestCompanion[]): string[] {
  return ORDER.flatMap((state) => {
    const names = companions.filter((companion) => companion.state === state).map(({ name }) => `${name}님`);
    return names.length === 0 ? [] : [WORDS[state](names.join(', '))];
  });
}

export interface CompanionsView {
  consented: number;
  // The companions not out: the gathering line's count is over them.
  inRequest: number;
  lines: string[];
  canAskOneMore: boolean;
}

// Null for a server that sends no `companions`: the card shows the request from `consents` alone.
export function companionsView(request: RoomRequest): CompanionsView | null {
  const { companions, status } = request;
  if (companions === undefined) {
    return null;
  }
  const moreNeeded = request.moreNeeded ?? 0;
  const active = status === 'gathering' || status === 'ready';
  const more = status === 'gathering' && moreNeeded > 0 ? [`${moreNeeded}명 더 필요해요`] : [];
  return {
    consented: companions.filter(({ state }) => state === 'consented').length,
    inRequest: companions.filter((companion) => isIn(companion)).length,
    lines: active ? [...companionLines(companions), ...more] : [],
    canAskOneMore: status === 'gathering' && request.madeForBooking,
  };
}

// The Friends one more may be from: a companion who went out may be asked again.
export function askableFriends<Friend extends { id: string }>(
  friends: readonly Friend[],
  request: RoomRequest,
): Friend[] {
  const asked = new Set((request.companions ?? []).filter((companion) => isIn(companion)).map(({ userId }) => userId));
  return friends.filter(({ id }) => !asked.has(id));
}

// A refused Friend comes with the words of the request's making; anything else is the card's own failure.
export function askRefusalWords(error: unknown): string {
  if (error instanceof ApiError && error.code === 'ROOM_REQUEST_REFUSED') {
    const message: unknown =
      typeof error.body === 'object' && error.body !== null ? Reflect.get(error.body, 'message') : undefined;
    if (typeof message === 'string' && message !== '') {
      return message;
    }
  }
  return ASK_FAILED;
}
