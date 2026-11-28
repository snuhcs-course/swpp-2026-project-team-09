/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { type MealInput } from '../dto/answer.dto.js';
import { freeTimeOf } from '../free-time/free-time.js';
import { type GatheringPerson } from './gathering.js';
import { type AnswerPerson } from './meal-answer.js';
import { locationPlaceOf } from './other-friends.js';
import { conditionsOf } from './plan-conditions.js';

// Each person of a meal's plan as the gathering reads them: their free time, where they are, and the constraints the
// asker set, the asker first.
export function gatheringPeopleOf(
  people: readonly AnswerPerson[],
  friends: readonly FriendView[],
  given: MealInput,
  { now, placeIdAt }: { now: Date; placeIdAt: (position: Position | null) => string | null },
): [GatheringPerson, ...GatheringPerson[]] {
  const [asker, ...others] = people.map(({ userId, items, position }, index): GatheringPerson => ({
    id: userId,
    free: freeTimeOf(items, given.date, now),
    locationPlaceId: index === 0 ? placeIdAt(position) : locationPlaceOf(friends[index - 1]),
    ...(index === 0 ? { positionOnly: true as const } : {}),
    ...conditionsOf(given.people[index]?.constraints ?? [], given.date),
  }));
  if (asker === undefined) {
    throw new Error('A plan has its asker');
  }
  return [asker, ...others];
}
