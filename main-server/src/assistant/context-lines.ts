/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RequestContext } from './dto/answer.dto.js';

// What the app knew as the User asked, as the lines the model reads after their message.
export function contextLines({ conditions, planId, tapped }: RequestContext): string[] {
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
  } else if (conditions !== null) {
    const { date, meal, people, window, placeId } = conditions;
    const plan = {
      plan: planId,
      date,
      meal,
      friendIds: people.slice(1).map(({ userId }) => userId),
      from: window.from,
      until: window.until,
      placeId,
    };
    lines.push(`[Plan on screen: ${JSON.stringify(plan)}]`);
  }
  if (tapped !== null) {
    lines.push(`[Tapped: ${tapped.kind === 'friend' ? `friend ${tapped.userId}` : `place ${tapped.placeId}`}]`);
  }
  return lines;
}
