/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { STUDY_PLAN_ANSWER, STUDY_PLAN_ASKED, STUDY_PLAN_REPLY } from '@/api/mock/data/study-plan-answer';
import { isLibraryAsk, libraryReply } from '@/api/mock/library-replies';

// The mock's study answer alone (P10 ticket 17): asked in its own words until the app says `study-plan` (ticket 23),
// with each Plan's scene as the main server draws it (`study-plan-parts.ts`).

// Partitions: the study answer's words; "공부할 자리 있어?". Expected values: the stored answer and today's seat card.
describe("the mock's answer of where to study alone", () => {
  it('answers its own words with the places to study', () => {
    expect(isLibraryAsk(STUDY_PLAN_ASKED)).toBe(true);
    expect(libraryReply(STUDY_PLAN_ASKED)).toBe(STUDY_PLAN_REPLY);
  });

  it('keeps "공부할 자리 있어?" the seat card', () => {
    expect(libraryReply('공부할 자리 있어?').cards[0]?.kind).toBe('library');
  });
});

// Partitions: the first Plan's scene and the third's. Expected values: the stored answer's four buildings and its dropped one.
describe("the stored study answer's scenes", () => {
  it('hold every building, its own the pick and the others numbered, and the dropped one grey', () => {
    const scenes = [0, 2].map((index) => STUDY_PLAN_ANSWER.plans[index]?.scene.places ?? []);

    expect(scenes.map((places) => places.map(({ role, order }) => [role, order ?? null]))).toEqual([
      [
        ['pick', 1],
        ['candidate', 2],
        ['candidate', 3],
        ['candidate', 4],
        ['dropped', null],
      ],
      [
        ['candidate', 1],
        ['candidate', 2],
        ['pick', 3],
        ['candidate', 4],
        ['dropped', null],
      ],
    ]);
  });

  it('flags the pick with its arrival to study', () => {
    expect(STUDY_PLAN_ANSWER.plans[0]?.scene.flags).toEqual([
      { at: { latitude: 37.4504, longitude: 126.9529 }, text: '19:12 공부', role: 'place' },
    ]);
  });
});
