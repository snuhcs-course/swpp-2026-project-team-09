/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, AnswerReply, Plan } from '@/api/assistant-types';
import { koreaClock } from '@/korea-time';
import { peopleOf } from './plan-input';

// A meal's Plan taken alone with "여기로" (boards s4 and s4b): where the User goes, and whether they will be told when
// to leave for their next item, by the main server's rule for a walk alone (a leave-by only for a walk on of 5 minutes
// or more, still to come), read from the User's own part of the Plan.

const MINUTE_MS = 60_000;
export const LEAVE_BY_WALK_MIN = 5;
const HANGUL_FIRST = 0xac_00;
const HANGUL_SYLLABLES = 11_172;
const FINALS = 28;
const FINAL_RIEUL = 8;

// A meal's Plan of the User alone, which "여기로" takes in place of "이대로 초대".
export function isMealAlone(answer: AnswerReply | null): boolean {
  return answer?.input.kind === 'meal' && peopleOf(answer.input).length === 1;
}

// 으로 after a final consonant other than ㄹ, and 로 otherwise.
function toward(word: string): string {
  const syllable = (word.at(-1)?.codePointAt(0) ?? 0) - HANGUL_FIRST;
  const final = syllable >= 0 && syllable < HANGUL_SYLLABLES ? syllable % FINALS : 0;
  return final !== 0 && final !== FINAL_RIEUL ? '으로' : '로';
}

const own = (plan: Plan): Plan['parts'][number] | undefined => plan.parts.find(({ me }) => me);

// The User walks to the Restaurant, rather than eating where they are.
export function walksThere(plan: Plan): boolean {
  return own(plan)?.walkMinutes !== 0;
}

// "**학생회관식당**으로 가요".
export function goingTo(label: string): AnswerLine {
  return [
    { text: label, strong: true },
    { text: `${toward(label)} 가요`, strong: false },
  ];
}

function goingLine(plan: Plan): AnswerLine {
  const { label } = plan.place;
  return walksThere(plan)
    ? goingTo(label)
    : [
        { text: label, strong: true },
        { text: '에서 먹어요', strong: false },
      ];
}

// The next item is a Class when the answer's "until" chip says "… 수업까지".
function nextWordOf(answer: AnswerReply): string {
  const until = answer.chips.find(({ kind }) => kind === 'until');
  return until?.text.endsWith('수업까지') === true ? '수업' : '일정';
}

function leaveLine(plan: Plan, nextWord: string, now: Date): string {
  const part = own(plan);
  if (part?.next === undefined || part.next === null || part.leaveBy === null) {
    return '오늘은 다음 일정이 없어 나설 알림은 없어요';
  }
  const walk = Math.round((new Date(part.next.startAt).getTime() - new Date(part.leaveBy).getTime()) / MINUTE_MS);
  if (part.next.place === null || walk < LEAVE_BY_WALK_MIN) {
    return `${nextWord}까지 ${String(walk)}분이라 나설 알림은 없어요`;
  }
  if (new Date(part.leaveBy).getTime() <= now.getTime()) {
    return `${koreaClock(part.leaveBy)}엔 나서야 해요`;
  }
  return `${koreaClock(part.leaveBy)}에 나설 시각을 알려 드릴게요`;
}

export function takenLines(answer: AnswerReply, plan: Plan, now: Date): AnswerLine[] {
  return [goingLine(plan), [{ text: leaveLine(plan, nextWordOf(answer), now), strong: false }]];
}
