/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type Plan } from '../dto/answer.dto.js';
import { hasFinal } from '../gathering/answer-words.js';
import { groupSentence } from './study-group-words.js';

// What the model is told of a study answer (P10 ticket 04), and the one sentence a reply with no words of its own says
// over it: the first plan and why it comes first. Never a seat count.

// A stay this long or longer counts as long enough, and the nearer comes first (study-plan.ts).
const LONG_ENOUGH_MINUTES = 3 * 60;

const clockOf = (time: string): string => time.slice(11, 16);

// Why the first plan comes first, as the words before its name: "13:00 수업까지 가장 오래 있을 수 있는 ", "열려 있는 곳 중
// 가장 가까운 ", or, when no plan is known open, "여는 시간은 모르지만 가장 가까운 ".
function whyFirst(first: Plan, { chips }: AnswerReply): string {
  if (first.study?.spaces[0]?.open !== 'open') {
    return '여는 시간은 모르지만 가장 가까운 ';
  }
  if (first.togetherMinutes >= LONG_ENOUGH_MINUTES) {
    return '열려 있는 곳 중 가장 가까운 ';
  }
  const until = chips.find(({ kind }) => kind === 'until')?.text;
  return until === undefined ? '가장 오래 있을 수 있는 ' : `${until} 가장 오래 있을 수 있는 `;
}

// "13:00 수업까지 가장 오래 있을 수 있는 공대 신양학술정보관을 추천해요.", or together "네 명이 모두 비는 내일 15:00에 관정
// 4층 6인실을 추천해요." Null for any other answer, or one with no plan.
export function wordlessStudySentence(answer: AnswerReply | null): string | null {
  const first = answer?.plans[0];
  if (answer === null || answer.input.kind !== 'study' || first === undefined) {
    return null;
  }
  const group = first.study?.group;
  if (group !== undefined) {
    return groupSentence(first, group);
  }
  return `${whyFirst(first, answer)}${first.id}${hasFinal(first.id) ? '을' : '를'} 추천해요.`;
}

// The plans in words for the model, in order, numbered as the list numbers them; or why there is none.
export function studyWords(answer: AnswerReply): object {
  if (answer.noPlan !== null) {
    const reason = answer.noPlan.lines.map((line) => line.map(({ text }) => text).join('')).join(' ');
    return { result: 'none', reason };
  }
  return {
    result: 'planned',
    order:
      'Known open first, then hours not known; each by the longest stay before the next item or the end asked, a stay of three hours or more counting as long enough, then the shorter walk.',
    why: wordlessStudySentence(answer),
    plans: answer.plans.map((plan, index) => {
      const [space] = plan.study?.spaces ?? [];
      return {
        number: index + 1,
        building: plan.id,
        space: space?.name ?? null,
        hours: space?.open === 'open' ? 'open' : 'not known',
        closesAt: space?.closesAt ?? null,
        walkMinutes: plan.parts[0]?.walkMinutes ?? null,
        stay: `${clockOf(plan.startAt)}–${clockOf(plan.endAt)} (${plan.togetherMinutes}분)`,
        bookable: plan.study?.book !== null && plan.study?.book !== undefined,
      };
    }),
    dropped: answer.dropped.map(({ place, reason }) => `${place.label}: ${reason}`),
    closed: (answer.closed ?? []).map(({ place, notices }) => `${place.label}: ${notices.join(', ')}`),
  };
}
