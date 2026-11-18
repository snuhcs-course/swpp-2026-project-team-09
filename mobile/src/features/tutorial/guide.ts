/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { TutorialGuide, TutorialGuidePlace, TutorialKind, TutorialStep } from '@/api/tutorial-types';

// What a Tutorial Quest's guide on the map shows where (the canvas's `MainTutorialCard*` and `MainTut*` boards, P15
// ticket 53), from the guide the main server serves and where the User is in it.

// Where the User is in a guide: the kind chosen (null before, for a guide with kinds), the step, and the spot of a
// step with several.
export interface GuidePosition {
  kind: string | null;
  step: number;
  spot: number;
}

export function kindOf(guide: TutorialGuide, kind: string | null): TutorialKind | null {
  return guide.kinds?.find(({ key }) => key === kind) ?? null;
}

// Before a kind is chosen: the bubble offers the kinds, and the main button says "종류를 골라 주세요".
export function isChoosing(guide: TutorialGuide, kind: string | null): boolean {
  return guide.kinds !== undefined && kindOf(guide, kind) === null;
}

// The steps shown: the guide's, the chosen kind's, or none while choosing.
export function stepsOf(guide: TutorialGuide, kind: string | null): readonly TutorialStep[] {
  return guide.steps ?? kindOf(guide, kind)?.steps ?? [];
}

// The step shown, kept within the steps.
export function stepAt(
  guide: TutorialGuide,
  { kind, step }: GuidePosition,
): { step: TutorialStep; index: number } | null {
  const steps = stepsOf(guide, kind);
  const index = Math.max(0, Math.min(steps.length - 1, step));
  const shown = steps[index];
  return shown === undefined ? null : { step: shown, index };
}

// The bottom panel's main button: off while choosing; ✓ 완료 on the last step, or on every step of a guide of places
// side by side; 다음 → otherwise.
export function mainButtonOf(guide: TutorialGuide, position: GuidePosition): 'choose' | 'next' | 'done' {
  if (isChoosing(guide, position.kind)) {
    return 'choose';
  }
  const shown = stepAt(guide, position);
  const last = stepsOf(guide, position.kind).length - 1;
  return guide.together === true || shown === null || shown.index >= last ? 'done' : 'next';
}

// ←: on a step after the first, or on the first step of a chosen kind (back to the choice); never in a guide of places
// side by side.
export function hasPrevious(guide: TutorialGuide, position: GuidePosition): boolean {
  if (guide.together === true || isChoosing(guide, position.kind)) {
    return false;
  }
  return (stepAt(guide, position)?.index ?? 0) > 0 || guide.kinds !== undefined;
}

// The places a guide names, every kind's and every spot's, for the map to fit them all in at once: the map stays as
// the steps change.
export function placesOf(guide: TutorialGuide): TutorialGuidePlace[] {
  const steps = [...(guide.steps ?? []), ...(guide.kinds ?? []).flatMap(({ steps: kindSteps }) => kindSteps)];
  const places: TutorialGuidePlace[] = [];
  for (const { place, spots } of steps) {
    if (place !== undefined) {
      places.push(place);
    }
    for (const spot of spots ?? []) {
      if (spot.place !== undefined) {
        places.push(spot.place);
      }
    }
  }
  return places;
}

function samePlace(one: TutorialGuidePlace, other: TutorialGuidePlace): boolean {
  if ('place' in one || 'place' in other) {
    return 'place' in one && 'place' in other && one.place === other.place;
  }
  return one.point.latitude === other.point.latitude && one.point.longitude === other.point.longitude;
}

// The steps whose place is the same, as one pin: the 관정 quest's three steps stand at one place.
export function stepsAtOnePlace(steps: readonly TutorialStep[]): number[][] {
  const groups: number[][] = [];
  steps.forEach(({ place }, index) => {
    if (place === undefined) {
      return;
    }
    const group = groups.find((indexes) => {
      const first = steps[indexes[0] ?? -1]?.place;
      return first !== undefined && samePlace(first, place);
    });
    if (group === undefined) {
      groups.push([index]);
    } else {
      group.push(index);
    }
  });
  return groups;
}
