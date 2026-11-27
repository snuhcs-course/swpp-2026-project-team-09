/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlanInput, type RequestContext, type StudyInput } from './dto/answer.dto.js';
import { isTogether } from './lookup/study-group.js';
import { KWANJEONG_BUILDING, seatToBook } from './lookup/study-plan-parts.js';
import { requestKey } from './presented.js';

// The study plan on screen (P10), with the places the app numbers.
function studyFacts(input: StudyInput, planId: string | null, planIds?: string[]): object {
  const { date, what, people, window, area, minutes } = input;
  const friendIds = people.slice(1).map(({ userId }) => userId);
  const plan = {
    plan: planId,
    kind: 'study',
    date,
    what,
    friendIds,
    from: window.from,
    until: window.until,
    minutes,
    near: area !== null,
  };
  // 관정관's plan shown, alone, books its seat (P10 ticket 05); together its room is the request's (ticket 07).
  const together = isTogether(input);
  const book = planId === KWANJEONG_BUILDING && !together ? seatToBook(input) : null;
  const more = {
    ...(together ? { together: true } : {}),
    ...(book === null ? {} : { book: book.spaceId }),
    ...(planIds === undefined ? {} : { numbered: planIds }),
  };
  return { ...plan, ...more };
}

// A plan on screen as the model reads it: its conditions, and the plan open and the plans numbered, if any.
function planFacts(conditions: PlanInput, planId: string | null, planIds?: string[]): object {
  if (conditions.kind === 'events') {
    const { date, eventIds } = conditions;
    return { plan: planId, kind: 'events', date, eventIds };
  }
  if (conditions.kind === 'quests') {
    const { globalEventId, questIds } = conditions;
    return { plan: planId, kind: 'quests', globalEventId, questIds };
  }
  if (conditions.kind === 'new-quest') {
    const { date, globalEventId, title, placeId, time, people, board } = conditions;
    const friendIds = people.slice(1).map(({ userId }) => userId);
    return { plan: planId, kind: 'new-quest', date, globalEventId, title, placeId, time, friendIds, board };
  }
  if (conditions.kind === 'meet') {
    const { date, people, window, placeId } = conditions;
    const friendIds = people.slice(1).map(({ userId }) => userId);
    return { plan: planId, kind: 'meet', date, friendIds, from: window.from, until: window.until, placeId };
  }
  if (conditions.kind === 'study') {
    return studyFacts(conditions, planId, planIds);
  }
  const { date, meal, people, window, placeId } = conditions;
  return {
    plan: planId,
    date,
    meal,
    friendIds: people.slice(1).map(({ userId }) => userId),
    from: window.from,
    until: window.until,
    ...(window.now === true ? { now: true } : {}),
    placeId,
    ...(planIds === undefined ? {} : { numbered: planIds }),
  };
}

// What the app knew as the User asked, as the lines the model reads after their message. A reply that drew several
// answers (P05 ticket 73) also has the others of them on screen, as steps the User did not open.
export function contextLines({ conditions, planId, planIds, tapped, answers = [] }: RequestContext): string[] {
  const lines: string[] = [];
  if (conditions !== null) {
    lines.push(`[Plan on screen: ${JSON.stringify(planFacts(conditions, planId, planIds))}]`);
  }
  const open = conditions === null ? null : requestKey(conditions);
  for (const other of answers.filter((input) => requestKey(input) !== open)) {
    lines.push(`[Another step on screen: ${JSON.stringify(planFacts(other, null))}]`);
  }
  if (tapped !== null) {
    lines.push(`[Tapped: ${tapped.kind === 'friend' ? `friend ${tapped.userId}` : `place ${tapped.placeId}`}]`);
  }
  return lines;
}
