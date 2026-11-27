/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ANSWER_CAPABILITIES } from '@/api/assistant-types';
import { STUDY_PLAN_ANSWER, STUDY_PLAN_REPLY } from '@/api/mock/data/study-plan-answer';
import { isLibraryAsk, libraryReply } from '@/api/mock/library-replies';

// The mock's study answer alone (P10 tickets 17 and 23): the app says `study-plan`, so "공부할 자리 있어?" asked without
// a booking is the places to study, as the main server answers it (`LIBRARY_STUDY_RULES`); a seat named or asked to be
// booked stays the seat card. Each Plan's scene is as the main server draws it (`study-plan-parts.ts`).

// Partitions: where to study, asked without a booking; a reading room named; a booking asked. Expected values: the
// stored answer and today's seat card.
describe("the mock's answer of where to study alone", () => {
  it('is what the app says it draws', () => {
    expect(ANSWER_CAPABILITIES).toContain('study-plan');
  });

  it.each(['공부할 자리 있어?', '공부할 곳 추천해 줘'])('answers "%s" with the places to study', (words) => {
    expect(isLibraryAsk(words)).toBe(true);
    expect(libraryReply(words)).toBe(STUDY_PLAN_REPLY);
  });

  it.each(['관정 열람실 자리 있어?', '공부할 자리 예약해 줘'])('keeps "%s" the seat card', (words) => {
    expect(libraryReply(words).cards[0]?.kind).toBe('library');
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
