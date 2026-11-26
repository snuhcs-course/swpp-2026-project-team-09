/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RequestContext, type StudyInput } from './dto/answer.dto.js';
import { bookOf, KWANJEONG_BUILDING } from './lookup/study-plan-parts.js';

// The study plan on screen (P10), with the places the app numbers.
function studyLine(input: StudyInput, planId: string | null, planIds?: string[]): string {
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
  // 관정관's plan shown, alone, books its seat (P10 ticket 05); with Friends its room is the request's.
  const book = planId === KWANJEONG_BUILDING && friendIds.length === 0 ? bookOf(what) : null;
  const more = {
    ...(book === null ? {} : { book: book.spaceId }),
    ...(planIds === undefined ? {} : { numbered: planIds }),
  };
  return `[Plan on screen: ${JSON.stringify({ ...plan, ...more })}]`;
}

// What the app knew as the User asked, as the lines the model reads after their message.
export function contextLines({ conditions, planId, planIds, tapped }: RequestContext): string[] {
  const lines: string[] = [];
  if (conditions?.kind === 'events') {
    const { date, eventIds } = conditions;
    lines.push(`[Plan on screen: ${JSON.stringify({ plan: planId, kind: 'events', date, eventIds })}]`);
  } else if (conditions?.kind === 'quests') {
    const { globalEventId, questIds } = conditions;
    lines.push(`[Plan on screen: ${JSON.stringify({ plan: planId, kind: 'quests', globalEventId, questIds })}]`);
  } else if (conditions?.kind === 'new-quest') {
    const { date, globalEventId, title, placeId, time, people, board } = conditions;
    const friendIds = people.slice(1).map(({ userId }) => userId);
    const plan = { plan: planId, kind: 'new-quest', date, globalEventId, title, placeId, time, friendIds, board };
    lines.push(`[Plan on screen: ${JSON.stringify(plan)}]`);
  } else if (conditions?.kind === 'meet') {
    const { date, people, window, placeId } = conditions;
    const friendIds = people.slice(1).map(({ userId }) => userId);
    const plan = { plan: planId, kind: 'meet', date, friendIds, from: window.from, until: window.until, placeId };
    lines.push(`[Plan on screen: ${JSON.stringify(plan)}]`);
  } else if (conditions?.kind === 'study') {
    lines.push(studyLine(conditions, planId, planIds));
  } else if (conditions !== null) {
    const { date, meal, people, window, placeId } = conditions;
    const plan = {
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
    lines.push(`[Plan on screen: ${JSON.stringify(plan)}]`);
  }
  if (tapped !== null) {
    lines.push(`[Tapped: ${tapped.kind === 'friend' ? `friend ${tapped.userId}` : `place ${tapped.placeId}`}]`);
  }
  return lines;
}
