/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { NO_STANDINGS } from '@/features/assistant/invited-friends';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { MapCamera } from '@/map';
import type { Room } from '@/screens/main/layout';
import { useAnswerMap } from '@/screens/main/use-answer-map';
import { type Asked, mapOf } from './main-map-stand-in';
import { NO_ANSWER } from './no-answer';

// The stored meal answer drawn by `useAnswerMap` over a stand-in map, for the hook's unit tests. A test file that uses it
// stands in for the walking route service and the safe area itself (`answer-map-hook.unit.test.tsx`).

// The emulator's numbers: a stage of 411 by 914 under no status bar, and a card of 274. Nothing takes the top (the way
// back is in the card) and the card 274 at the bottom, each with the 8 of ticket 08's area and the room the marks there need: for the first
// Plan 24 above (자하연식당 2층's label is at its left) and 66 below (the pick's two lines under 302동, 18 + 2 + 46), so
// the area is from 32 to 566; for the third Plan 24 and 24 (302동's labels are at its sides). A campus map of that
// view goes no further out than zoom 15.26 (see `answer-camera.unit.test.ts`).
export const SIZE = { width: 411, height: 914 };
export const ROOM: Room = {
  stage: SIZE,
  cardHeight: null,
  answerHeight: 274,
  tutorialStart: false,
  interestsHint: false,
};
export const FIT_ZOOM = 15.26;

export function shownAt(index: number): ShownAnswer {
  return { ...NO_ANSWER, source: MEAL_ANSWER, answer: MEAL_ANSWER, plan: MEAL_ANSWER.plans[index] ?? null, index };
}

export interface Given {
  shown: ShownAnswer;
  room: Room;
  fitZoom: number | null;
  // Where the map rests, as it tells it once a glide ends; left out, not yet told.
  camera?: MapCamera | null;
}

export const FIRST: Given = { shown: shownAt(0), room: ROOM, fitZoom: FIT_ZOOM };

// No Plan made into a Quest.
export const NOT_INVITED = {
  sending: false,
  made: null,
  standings: NO_STANDINGS,
  changed: null,
  changing: false,
  left: null,
};

export async function render(asked: Asked, given: Given = FIRST): Promise<(next: Given) => Promise<void>> {
  const { rerender } = await renderHook(
    ({ shown, room, fitZoom, camera = null }: Given) =>
      useAnswerMap(shown, { ...mapOf(fitZoom, asked), camera }, room, { avatars: [], cards: [] }, NOT_INVITED),
    { initialProps: given },
  );
  return async (next): Promise<void> => {
    await rerender(next);
  };
}
