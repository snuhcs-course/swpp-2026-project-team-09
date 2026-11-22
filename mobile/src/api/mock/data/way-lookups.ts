/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { isLookup } from '@/api/server/lookup-answers';
import late from './way-lookups/late.json';
import leave from './way-lookups/leave.json';
import notRunning from './way-lookups/shuttle-not-running.json';
import shuttle from './way-lookups/shuttle.json';

// The main server's Lookups of a way with a deadline, written by its `wayAnswer` over the seed's Places, walking table,
// shuttle timing, and stops, for the User of `way-lookup.ts` at 301동 on Tuesday 2026-11-17: at 12:40 on time for the
// 13:00 Class in 24동 (board q2), at 12:50 late for it (q3), and at 16:40 by the shuttle to the 17:00 Class in 58동 (q4);
// and at the endpoint at 22:10 on a Tuesday at 관정, asked about the shuttle to 919동 when it is not running (n21).

function checked(value: unknown, which: string): Lookup {
  if (!isLookup(value)) {
    throw new Error(`The stored Lookup ${which} fails the check of a reply`);
  }
  return value;
}

function replyOf(text: string, lookup: Lookup): AssistantReply & { lookup: Lookup } {
  return { text, mapButtons: [], cards: [], proposal: null, answer: null, lookup };
}

export const LEAVE_LOOKUP_REPLY = replyOf('12:45에 나서면 13:00 수업에 맞아요.', checked(leave, 'leave'));

export const LATE_LOOKUP_REPLY = replyOf('지금 가도 5분 늦어요.', checked(late, 'late'));

export const SHUTTLE_LOOKUP_REPLY = replyOf('16:43에 나서 셔틀을 타면 16:53에 도착해요.', checked(shuttle, 'shuttle'));

export const NOT_RUNNING_LOOKUP_REPLY = replyOf('셔틀은 지금 다니지 않아요.', checked(notRunning, 'not running'));

// The stored Lookups of a way, by the words of boards q4, q3, q2, and n21: by the shuttle, late, on time, and the
// shuttle not running. A question about the shuttle's arrival with no Place ("셔틀 몇 분 뒤에 와?") is none of them.
export function wayReplyOf(last: string): AssistantReply | null {
  if (last.includes('셔틀 탈까')) {
    return SHUTTLE_LOOKUP_REPLY;
  }
  if (last.includes('기숙사 가는 셔틀')) {
    return NOT_RUNNING_LOOKUP_REPLY;
  }
  if (last.includes('늦나')) {
    return LATE_LOOKUP_REPLY;
  }
  return last.includes('까지 몇 분') ? LEAVE_LOOKUP_REPLY : null;
}
