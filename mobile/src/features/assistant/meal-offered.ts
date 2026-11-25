/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, PlacePoint } from '@/api/assistant-types';
import { fadedPlan } from './answer-walks';

// A meal answer as the app offers it (P04 ticket 71, the user's word of 2026-11-26): only the places that can be done.
// Its Plans are those that can be done in the time, and the first, the Assistant's pick, though it cannot; the list and
// the map number them alike, 1 to n. The places that cannot be done leave the map too: those the main server dropped,
// and the Plans left out, so that the camera no longer fits to them. Any other answer is as it came. The same answer
// gives the same object, so that the screen still tells the reply whose answer it shows by its answer.

const keyOf = ({ placeId, label }: PlacePoint): string => `${placeId}:${label}`;

const offered = new WeakMap<AnswerReply, AnswerReply>();

export function offeredAnswer(answer: AnswerReply): AnswerReply {
  const known = offered.get(answer);
  if (known !== undefined) {
    return known;
  }
  const made = offerOf(answer);
  offered.set(answer, made);
  return made;
}

function offerOf(answer: AnswerReply): AnswerReply {
  if (answer.input.kind !== 'meal') {
    return answer;
  }
  const plans = answer.plans.filter((plan, index) => index === 0 || !fadedPlan(plan));
  const left = new Set(answer.plans.filter((plan) => !plans.includes(plan)).map(({ place }) => keyOf(place)));
  const drawn = (role: string, place: PlacePoint): boolean =>
    role !== 'dropped' && !(role === 'candidate' && left.has(keyOf(place)));
  if (
    plans.length === answer.plans.length &&
    plans.every(({ scene }) => scene.places.every(({ role, place }) => drawn(role, place)))
  ) {
    return answer;
  }
  return {
    ...answer,
    plans: plans.map((plan) =>
      Object.assign({}, plan, {
        scene: { ...plan.scene, places: plan.scene.places.filter(({ role, place }) => drawn(role, place)) },
      }),
    ),
  };
}
