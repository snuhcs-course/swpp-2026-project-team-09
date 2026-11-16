/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type AnswerReply, type Plan, type PlanInput } from '../assistant/dto/answer.dto.js';
import { clockOf } from '../assistant/free-time/free-time.js';
import { withToward } from '../assistant/gathering/answer-words.js';
import { type Told } from '../notifications/notification.js';

// A Plan taken alone ("여기로"): its leave-by and the two lines of the card after it (P03 ticket 15).

const MINUTE_MS = 60_000;
// A walk alone shorter than this gets no leave-by (the design's "Notifications").
export const LEAVE_BY_WALK_MIN = 5;

type NextWord = '수업' | '일정';
export type LeaveByFacts = Omit<Extract<Told, { kind: 'leave-by' }>, 'questId'>;

export interface AloneLeaveBy {
  // What the leave-by says, or null when none is kept.
  facts: LeaveByFacts | null;
  at: Date | null;
  line: string;
}

// The next item is a Class when the answer's until chip reads "… 수업까지", and else 일정.
export function nextWordOf(answer: Pick<AnswerReply, 'chips'>): NextWord {
  const until = answer.chips.find(({ kind }) => kind === 'until');
  return until?.text.endsWith('수업까지') === true ? '수업' : '일정';
}

function mineOf(plan: Plan): Plan['parts'][number] | undefined {
  return plan.parts.find(({ me }) => me);
}

function kept(facts: LeaveByFacts, at: Date): AloneLeaveBy {
  return { facts, at, line: `${clockOf(at)}에 나설 시각을 알려 드릴게요` };
}

// The walk on: from leaving the Plan's Place to the next item's start.
function walkOn(plan: Plan, nextWord: NextWord, now: Date): AloneLeaveBy {
  const part = mineOf(plan);
  if (part?.next === null || part?.next === undefined || part.leaveBy === null) {
    return { facts: null, at: null, line: '오늘은 다음 일정이 없어 나설 알림은 없어요' };
  }
  const at = new Date(part.leaveBy);
  const { startAt, place } = part.next;
  const walkMinutes = Math.round((new Date(startAt).getTime() - at.getTime()) / MINUTE_MS);
  if (place === null || walkMinutes < LEAVE_BY_WALK_MIN) {
    return { facts: null, at: null, line: `${nextWord}까지 ${String(walkMinutes)}분이라 나설 알림은 없어요` };
  }
  if (at.getTime() <= now.getTime()) {
    return { facts: null, at: null, line: `${clockOf(at)}엔 나서야 해요` };
  }
  const toward = { start: clockOf(new Date(startAt)), word: nextWord };
  return kept({ kind: 'leave-by', placeLabel: place.label, walkMinutes, toward }, at);
}

// The first walk of 5 minutes or more whose time is still ahead: to the Plan's Place, as for an event later in the
// day, or else on from it to the next item, as for a meal now.
export function aloneLeaveBy(plan: Plan, nextWord: NextWord, now: Date): AloneLeaveBy {
  const part = mineOf(plan);
  const leaveAt = part?.leaveAt ?? null;
  const walkMinutes = part?.walkMinutes ?? null;
  if (leaveAt !== null && walkMinutes !== null && walkMinutes >= LEAVE_BY_WALK_MIN) {
    const at = new Date(leaveAt);
    if (at.getTime() > now.getTime()) {
      const by = part?.mode === 'shuttle' ? { by: 'shuttle' as const } : {};
      return kept({ kind: 'leave-by', placeLabel: plan.place.label, walkMinutes, ...by }, at);
    }
  }
  return walkOn(plan, nextWord, now);
}

// "**학생회관식당**으로 가요", "**301동식당**에서 먹어요" for a meal where the User is, and "**채용박람회**에 가요" for an
// event.
export function goingLine(plan: Plan, kind: PlanInput['kind']): AnswerLine {
  if (kind === 'events') {
    return [
      { text: plan.title, strong: true },
      { text: '에 가요', strong: false },
    ];
  }
  const { label } = plan.place;
  const there = mineOf(plan)?.walkMinutes === 0;
  const rest = there ? `에서 ${kind === 'meal' ? '먹어요' : '봐요'}` : `${withToward(label).slice(label.length)} 가요`;
  return [
    { text: label, strong: true },
    { text: rest, strong: false },
  ];
}
