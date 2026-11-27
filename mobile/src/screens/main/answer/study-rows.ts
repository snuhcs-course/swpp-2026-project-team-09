/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Plan } from '@/api/assistant-types';
import type { StudySpot } from '@/api/study-plan-types';
import { addedWalk, fadedPlan, travelWords } from '@/features/assistant/answer-walks';
import { koreaClock } from '@/korea-time';

// A study answer alone in the meal answer's list (P10 ticket 18): what its rows, its first line, and its kinds of space
// say. The main server's words stand as they come: its order, its lines of a place's best space and hours, and why a
// place cannot be used.

// How the main server orders a study answer's places (`study-plan.ts`): the longest stay first, those known open first.
export const STUDY_ORDER_WORDS = '오래 머무는 순';

// The kinds of space a study answer's chips choose among, in the board's order: a reading room (a library's own
// included), a lounge, a PC room, and a group room.
export type StudyKind = '열람실' | '라운지' | 'PC' | '그룹';

const KIND_OF: Readonly<Record<StudySpot['kind'], StudyKind>> = {
  library: '열람실',
  reading: '열람실',
  lounge: '라운지',
  pc: 'PC',
  group: '그룹',
};

const KINDS: readonly StudyKind[] = ['열람실', '라운지', 'PC', '그룹'];

// Whether a place has a space of that kind.
export function hasKind(plan: Plan, kind: StudyKind): boolean {
  return (plan.study?.spaces ?? []).some((space) => KIND_OF[space.kind] === kind);
}

// The kinds the places' spaces hold, each with its count of places, in the board's order. Fewer than two kinds choose
// nothing: none then, as a meal answer's kinds of food.
export function studyKindsOf(plans: readonly Plan[]): { kind: StudyKind; places: number }[] {
  const kinds = KINDS.map((kind) => ({ kind, places: plans.filter((plan) => hasKind(plan, kind)).length })).filter(
    ({ places }) => places > 0,
  );
  return kinds.length < 2 ? [] : kinds;
}

// A place's row: its building; its best space and hours as the main server's lines say them, "3층 자유열람실 · 24시간"
// or "1층 라운지 · 여는 시간을 몰라요"; and at the right the way there, "걸음 4분", or its arrival when the way is not known.
export function studyRowOf(
  plan: Plan,
  index: number,
): {
  number: number;
  planId: string;
  name: string;
  detail: string | null;
  side: string;
  walk: number | null;
  faded: boolean;
  startAt: string;
} {
  const words = plan.lines.map((line) => line.map(({ text }) => text).join('')).filter((line) => line !== '');
  return {
    number: index + 1,
    planId: plan.id,
    name: plan.place.label,
    detail: words.length === 0 ? null : words.join(' · '),
    side: travelWords(plan) ?? `${koreaClock(plan.startAt)} 도착`,
    walk: addedWalk(plan),
    faded: fadedPlan(plan),
    startAt: plan.startAt,
  };
}

// The places none may use but their students, at the list's very end with the main server's words of why.
export function droppedRowsOf(answer: AnswerReply): { key: string; name: string; reason: string }[] {
  return answer.dropped.map(({ place, reason }) => ({
    key: `${place.placeId}:${place.label}`,
    name: place.label,
    reason,
  }));
}
