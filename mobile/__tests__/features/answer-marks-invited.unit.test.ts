/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { drawingOf } from '@/features/assistant/answer-marks';
import type { Standing } from '@/features/assistant/invited-friends';
import { label, ME_ID, MINSU_ID, seen } from '../support/answer-marks';

function minsuAs(standing: Standing): Map<string, Standing> {
  return new Map([[MINSU_ID, standing]]);
}

// Partitions of a Friend's state after inviting: invited, accepted, declined, and late; the User's own dot beside
// them. Expected values: the P02 spec, "How each Friend stands", over the first Plan of the stored answer to
// "배고파, 민수랑 같이", where 민수's dashed face has its label at the right.
describe("the faces of the answer's first Plan after inviting", () => {
  it('give 민수\'s face a "?" and the name with "아직 안 봄" while the invitation waits', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0, minsuAs({ state: 'invited', lateMinutes: null }));

    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toEqual({
      name: '민수 · 아직 안 봄',
      symbol: { type: 'face', name: '민수', dashed: true, badge: 'waiting' },
      label: label('right', 'person', '민수 · 아직 안 봄'),
      planId: null,
    });
  });

  it('give 민수\'s face a "✓" and the name with "수락" once accepted', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0, minsuAs({ state: 'accepted', lateMinutes: null }));

    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toMatchObject({
      name: '민수 · 수락',
      symbol: { type: 'face', name: '민수', dashed: true, badge: 'accepted' },
      label: label('right', 'person', '민수 · 수락'),
    });
  });

  it.each([
    [{ state: 'declined', lateMinutes: null }, '민수 · 거절'],
    [{ state: 'late', lateMinutes: 5 }, '민수 · 5분 늦음'],
  ] as const)('give no badge for %o, and the name "%s"', (standing, name) => {
    const drawing = drawingOf(MEAL_ANSWER, 0, minsuAs(standing));

    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toEqual({
      name,
      symbol: { type: 'face', name: '민수', dashed: true },
      label: label('right', 'person', name),
      planId: null,
    });
  });

  it("leave the User's own dot as it is", () => {
    const drawing = drawingOf(MEAL_ANSWER, 0, new Map([[ME_ID, { state: 'accepted', lateMinutes: null }]]));

    expect(seen(drawing, 'answer:me')).toEqual({
      name: '나 · 3분',
      symbol: { type: 'me' },
      label: label('right', 'person', '나 · 3분'),
      planId: null,
    });
  });
});
