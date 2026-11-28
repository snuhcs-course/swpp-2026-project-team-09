/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibrarySpace, MapScene } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { now } from '@/clock';
import type { Draft } from '@/features/assistant/answer-groups';
import { type ShownSteps, stepDrafts, stepLine, stepsScene, stepTitle } from '@/features/assistant/steps-scene';
import type { FrameKey } from './framed-camera';
import { isCardStep, stepPressOf } from './step-press';

// What is known of the booking a seat's step shows: its card's key, the seat its card offers or the seat booked, its
// space, and whether it is booked.
export interface StepBooking {
  key: string | null;
  seat: string | null;
  space: LibrarySpace | null;
  booked: boolean;
}

// What the steps' camera frames: the reply, the step chosen, and where each step is, which another plan of a step's
// answer, or a recalculation that brings another place, moves (P03 ticket 21). A booking's time moves no step.
export function stepsFrame({ bubbleId, steps }: ShownSteps, active: number): FrameKey {
  const places = steps.map(({ place }) =>
    place === null ? '' : `${String(place.latitude)},${String(place.longitude)}`,
  );
  return { reply: `steps:${String(bubbleId)}`, chosen: [active, places.join('|')] };
}

// The steps' marks with their flags' words (P04 ticket 09): the step due, or chosen, carries the seat its card offers;
// a booking made carries its seat and "예약됨" whichever step is chosen (P10 ticket 29). The step `leftOut` is drawn as
// its answer or booking alone, and has none (P03 ticket 26).
export function stepMarks(
  { steps }: ShownSteps,
  active: number,
  { key, seat, space, booked }: StepBooking,
  leftOut: number | null,
): Draft[] {
  const at = now();
  const lines = steps.map((step, index) => {
    const card = isCardStep(step, key);
    return stepLine(step, card && (booked || index === active) ? seat : null, at, card && booked);
  });
  const titles = steps.map((step) => stepTitle(step, isCardStep(step, key) ? space : null));
  // A flag's "›" says what a press on it does, by the rule the press itself follows (`stepPressOf`).
  const opens = steps.map((step, index) => stepPressOf(step, index, { active, key }) !== null);
  return stepDrafts(steps, lines, titles, opens, leftOut);
}

// The steps alone, when the step chosen has no drawing of its own (a room, a step not done, an answer with no Plan):
// every step as its kind's mark, the User's walk to the first, and a way from each to the next. Null with no step at
// a place.
export function stepsAlone(
  shown: ShownSteps,
  active: number,
  booking: StepBooking,
  position: LatLng | null,
): { scene: MapScene; drafts: Draft[]; flag: LatLng } | null {
  const first = shown.steps.find(({ place }) => place !== null)?.place;
  if (first === undefined || first === null) {
    return null;
  }
  return {
    scene: stepsScene(shown.steps, position),
    drafts: stepMarks(shown, active, booking, null),
    flag: { latitude: first.latitude, longitude: first.longitude },
  };
}
