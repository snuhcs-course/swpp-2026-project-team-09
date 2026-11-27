/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type TimeBand } from '../dto/answer.dto.js';
import { type OtherFriend } from '../gathering/answer-words.js';
import { otherLane } from '../gathering/meal-scene.js';
import { setOutOf } from '../gathering/other-friends.js';

// The asker's other Friends on a study plan's time card (P10 ticket 07), for its "+ 같이": each with their busy time
// over the band's range and their walk to the plan's building, as a meal's band gives them.
export function studyOthers(
  others: readonly OtherFriend[] | undefined,
  plan: { date: string; now: Date; placeId: string; start: Date; end: Date },
  range: { from: Date; until: Date; label: (placeId: string) => string },
): Pick<TimeBand, 'others'> {
  if (others === undefined) {
    return {};
  }
  const { date, now, placeId, start, end } = plan;
  return {
    others: others.map((other) => otherLane(other, setOutOf(other, { start, end }, { date, now, placeId }), range)),
  };
}
