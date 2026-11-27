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
// map draws the flag of a Quest made from a Plan instead, two lines over a dot, since a tag (PR 572) has one line. Its
// first line is the room and its time in the time colour, which fits a label with a time at font scale 1.3; the day
// goes on the second. This file is the one place that look is chosen.

export interface RequestFlag {
  // "관정 그룹스터디룸"
  title: string;
  // "15:00", in the time colour.
  time: string;
  // "오늘", "내일", or "10월 3일 (토)".
  day: string;
  // "동의 1/3 · 기다리는 중", or "모두 동의 · 예약하기".
  state: string;
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
    time: koreaClock(start),
    day: koreaDay(start, now),
    state: status === 'ready' ? '모두 동의 · 예약하기' : `동의 ${String(consented)}/${String(asked)} · 기다리는 중`,
  };
}

// "관정 그룹스터디룸 내일 15:00": the words the answer is opened again with, and the flag's name.
export function requestWords({ title, day, time }: RequestFlag): string {
  return `${title} ${day} ${time}`;
}

// The lists' line under the Quest's title: "내일 15:00 · 동의 1/3 · 기다리는 중".
export function requestLine({ day, time, state }: RequestFlag): string {
  return `${day} ${time} · ${state}`;
}

// "관정 그룹스터디룸 15:00" over "내일 · 동의 1/3 · 기다리는 중".
export function requestLook({ title, time, day, state }: RequestFlag): MarkerLook {
  return {
    kind: 'answer',
    symbol: { type: 'dot', role: 'pick', number: null },
    label: { side: 'above', tone: 'pick', title, note: time, line: `${day} · ${state}`, study: true, number: null },
  };
}
