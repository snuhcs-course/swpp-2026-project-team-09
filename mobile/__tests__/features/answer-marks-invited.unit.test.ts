/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { drawingOf } from '@/features/assistant/answer-marks';
import type { Standing } from '@/features/assistant/invited-friends';
import { label, ME_ID, MINSU_ID, seen } from '../support/answer-marks';

function minsuAs(standing: Standing): Map<string, Standing> {
  return new Map([[MINSU_ID, standing]]);
}

// The stored answer for two people with 민수's name in the scene of its first Plan changed to `name`.
function firstWithMinsuNamed(name: string): AnswerReply {
  const plan = MEAL_ANSWER.plans[0];
  if (plan === undefined) {
    throw new Error('The stored answer has no first Plan');
  }
  const people = plan.scene.people.map((person) => (person.userId === MINSU_ID ? { ...person, name } : person));
  return { ...MEAL_ANSWER, plans: [{ ...plan, scene: { ...plan.scene, people } }, ...MEAL_ANSWER.plans.slice(1)] };
}

// Partitions of a Friend's state after inviting that carry a badge: invited, accepted, and late. Expected values: the
// P02 spec, "How each Friend stands", over the first Plan of the stored answer to "배고파, 민수랑 같이", where 민수's
// dashed face has its label at the right; and fix 6 of the design review of 2026-11-15: the face shows the two
// characters of "민수", so the label is the state alone, and the name read aloud keeps the name.
describe("the faces of the answer's first Plan after inviting", () => {
  it('give 민수\'s face a "?" and the label "아직 안 봄" while the invitation waits', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0, minsuAs({ state: 'invited', lateMinutes: null }));

    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toEqual({
      name: '민수 · 아직 안 봄',
      symbol: { type: 'face', name: '민수', dashed: true, badge: 'waiting' },
      label: label('right', 'person', '아직 안 봄'),
      planId: null,
    });
  });

  it('give 민수\'s face a "✓" and the label "수락" once accepted', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0, minsuAs({ state: 'accepted', lateMinutes: null }));

    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toMatchObject({
      name: '민수 · 수락',
      symbol: { type: 'face', name: '민수', dashed: true, badge: 'accepted' },
      label: label('right', 'person', '수락'),
    });
  });

  it('give 민수\'s face a "✓" and the label "5분 늦음" when late, for a late Friend is in', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0, minsuAs({ state: 'late', lateMinutes: 5 }));

    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toMatchObject({
      name: '민수 · 5분 늦음',
      symbol: { type: 'face', name: '민수', dashed: true, badge: 'accepted' },
      label: label('right', 'person', '5분 늦음'),
    });
  });
});

// Partitions: the states without a badge, declined and dropped; a name of three characters, which the face does not
// show whole; the User's own dot. Expected values as above.
describe("the faces of the answer's first Plan without a badge after inviting", () => {
  it.each([
    [{ state: 'declined', lateMinutes: null }, '민수 · 거절', '거절'],
    [{ state: 'dropped', lateMinutes: null }, '민수 · 빠짐', '빠짐'],
  ] as const)('give no badge for %o, the name "%s", and the label "%s"', (standing, name, title) => {
    const drawing = drawingOf(MEAL_ANSWER, 0, minsuAs(standing));

    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toEqual({
      name,
      symbol: { type: 'face', name: '민수', dashed: true },
      label: label('right', 'person', title),
      planId: null,
    });
  });

  it('keep the name in the label of a Friend named "강도윤"', () => {
    // Changed from the stored copy: 민수's name is "강도윤", whose face shows "강도" only.
    const drawing = drawingOf(firstWithMinsuNamed('강도윤'), 0, minsuAs({ state: 'invited', lateMinutes: null }));

    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toMatchObject({
      name: '강도윤 · 아직 안 봄',
      label: label('right', 'person', '강도윤 · 아직 안 봄'),
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
