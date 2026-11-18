/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { TUTORIAL_CONTENT } from '@/api/mock/data/tutorial';
import type { TutorialGuide } from '@/api/tutorial-types';
import {
  hasPrevious,
  isChoosing,
  mainButtonOf,
  placesOf,
  stepAt,
  stepsAtOnePlace,
  stepsOf,
} from '@/features/tutorial/guide';

// What a quest's guide on the map shows where (P15 ticket 53), over the guides of the content's copy.

function guideOf(key: string): TutorialGuide {
  const guide = TUTORIAL_CONTENT.find((quest) => quest.key === key)?.guide;
  if (guide === undefined) {
    throw new Error(`No guide for ${key}`);
  }
  return guide;
}

describe("the 학생증 guide's kinds", () => {
  const guide = guideOf('s-card');

  it('asks for a kind first, with the main button off and no ←', () => {
    const start = { kind: null, step: 0, spot: 0 };

    expect(isChoosing(guide, null)).toBe(true);
    expect(stepsOf(guide, null)).toEqual([]);
    expect(mainButtonOf(guide, start)).toBe('choose');
    expect(hasPrevious(guide, start)).toBe(false);
  });

  it("walks the chosen kind's steps, ← on the first going back to the choice", () => {
    expect(stepsOf(guide, 'plain').map(({ tab }) => tab)).toEqual(['신청', '수령', '모바일']);
    expect(stepsOf(guide, 'financial').map(({ tab }) => tab)).toEqual(['발급', '정보 등록', '모바일']);
    expect(mainButtonOf(guide, { kind: 'plain', step: 0, spot: 0 })).toBe('next');
    expect(hasPrevious(guide, { kind: 'plain', step: 0, spot: 0 })).toBe(true);
    expect(mainButtonOf(guide, { kind: 'plain', step: 2, spot: 0 })).toBe('done');
  });

  it('keeps a step out of range within the steps', () => {
    expect(stepAt(guide, { kind: 'plain', step: 9, spot: 0 })?.index).toBe(2);
  });
});

describe('a guide of places side by side', () => {
  const guide = guideOf('counseling-center');

  it('offers ✓ 완료 on every step, and no ←', () => {
    for (const step of [0, 1, 2, 3]) {
      expect(mainButtonOf(guide, { kind: null, step, spot: 0 })).toBe('done');
      expect(hasPrevious(guide, { kind: null, step, spot: 0 })).toBe(false);
    }
  });

  it("fits every spot's place, and leaves out those without one", () => {
    const places = placesOf(guide);

    expect(places).toHaveLength(2 + 9 + 3);
    expect(places).toContainEqual({ place: '919' });
  });
});

describe('a guide of numbered steps', () => {
  it('ends on ✓ 완료 after 다음', () => {
    const guide = guideOf('laptop-rental');

    expect(mainButtonOf(guide, { kind: null, step: 0, spot: 0 })).toBe('next');
    expect(mainButtonOf(guide, { kind: null, step: 1, spot: 0 })).toBe('done');
    expect(hasPrevious(guide, { kind: null, step: 1, spot: 0 })).toBe(true);
  });

  it("draws the 관정 quest's three steps at one place as one pin", () => {
    expect(stepsAtOnePlace(stepsOf(guideOf('kwanjeong'), null))).toEqual([[0, 1, 2]]);
    expect(stepsAtOnePlace(stepsOf(guideOf('night-shuttle'), null))).toEqual([[0], [2]]);
  });
});
