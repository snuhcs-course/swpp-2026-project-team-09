/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RequestContext } from './dto/answer.dto.js';

// What the app knew as the User asked, as the lines the model reads after their message.
export function contextLines({ conditions, planId, tapped }: RequestContext): string[] {
  const lines: string[] = [];
  if (conditions !== null) {
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
