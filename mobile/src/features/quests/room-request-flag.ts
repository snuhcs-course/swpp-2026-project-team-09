/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest, QuestRoomRequest } from '@/api/types';
import { koreaClock, koreaDay } from '@/korea-time';
import type { MarkerLook } from '@/map';

// A booking party's room request of studying together while it is out (P10 ticket 13; design group-study-resume 3):
// its words wherever the Quest is shown, and its look on the map. The design draws a glass tag with a second line; the
// map draws the flag of a Quest made from a Plan instead, two lines over a dot, since a tag (PR 572) has one line. This
// file is the one place that look is chosen.

export interface RequestFlag {
  // "관정 그룹스터디룸"
  title: string;
  // "내일 15:00", in the time colour.
  time: string;
  // "동의 1/3 · 기다리는 중", or "모두 동의 · 예약하기".
  line: string;
}

// The request the Quest is flagged for: one still gathering or ready. A booked or ended one is an ordinary Quest.
export function outRequestOf(quest: Pick<Quest, 'roomRequest'>): QuestRoomRequest | null {
  const request = quest.roomRequest ?? null;
  return request !== null && (request.status === 'gathering' || request.status === 'ready') ? request : null;
}

// `start` is the time of the Quest's step the lists and the map show.
export function requestFlagOf(quest: Pick<Quest, 'roomRequest'>, start: string | null, now: Date): RequestFlag | null {
  const request = outRequestOf(quest);
  if (request === null || start === null) {
    return null;
  }
  const { status, consented, asked } = request;
  return {
    title: '관정 그룹스터디룸',
    time: `${koreaDay(start, now)} ${koreaClock(start)}`,
    line: status === 'ready' ? '모두 동의 · 예약하기' : `동의 ${String(consented)}/${String(asked)} · 기다리는 중`,
  };
}

// "관정 그룹스터디룸 내일 15:00": the words the answer is opened again with.
export function requestWords({ title, time }: RequestFlag): string {
  return `${title} ${time}`;
}

// The lists' line under the Quest's title: "내일 15:00 · 동의 1/3 · 기다리는 중".
export function requestLine({ time, line }: RequestFlag): string {
  return `${time} · ${line}`;
}

export function requestLook({ title, time, line }: RequestFlag): MarkerLook {
  return {
    kind: 'answer',
    symbol: { type: 'dot', role: 'pick', number: null },
    label: { side: 'above', tone: 'pick', title, note: time, line, study: true, number: null },
  };
}
