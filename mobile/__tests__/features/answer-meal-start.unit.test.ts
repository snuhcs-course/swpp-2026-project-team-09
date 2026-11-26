/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Plan } from '@/api/assistant-types';
import { crowdedMealAnswer } from '@/api/mock/data/crowded-meal';
import { drawingOf } from '@/features/assistant/answer-marks';
import { startOf } from '@/features/assistant/answer-walks';
import { minutesOf, seen } from '../support/answer-marks';

// Where a meal answer's map says the User sets out from (P04 ticket 51): the start the answer used, never the end of a
// Class already over paired with a place. The crowded meal is on 2026-10-07, after a Class at 301동 ending at 10:45.
const PICK = '학생회관식당';
// 09:00 in Korea, before the Class ends; 12:00, the Class over.
const BEFORE = '2026-10-07T00:00:00Z';
const AFTER = '2026-10-07T03:00:00Z';

function answerAt(now: string, origin?: Plan['parts'][number]['origin']): AnswerReply {
  const answer = crowdedMealAnswer('2026-10-07', now);
  if (origin === undefined) {
    return answer;
  }
  const plans = answer.plans.map((plan) => ({
    ...plan,
    parts: plan.parts.map((part) => (part.me ? Object.assign({}, part, { origin }) : part)),
  }));
  return { ...answer, plans };
}

function shown(answer: AnswerReply): { label: string | undefined; plan: Plan | undefined } {
  const index = answer.plans.findIndex(({ place }) => place.label === PICK);
  const drawing = drawingOf(answer, index);
  return { label: seen(drawing, 'answer:me').label?.title, plan: answer.plans[index] };
}

// Partitions: the Class the User sets out from still to end; that Class over, from an older reply that keeps its place;
// the User's position; and a start not known.
describe('the start of a meal answer on the map', () => {
  it('is the end of the Class still to end, at its place', () => {
    expect(shown(answerAt(BEFORE)).label).toBe('10:45 301동');
  });

  it('is the place alone once that Class is over', () => {
    expect(shown(answerAt(AFTER)).label).toBe('301동');
  });

  it("is the User's position, with no time", () => {
    const here: Plan['parts'][number]['origin'] = {
      place: { placeId: 'here', label: '내 위치', latitude: 37.45, longitude: 126.95 },
      basis: 'location',
    };
    expect(shown(answerAt(AFTER, here)).label).toBe('지금 · 내 위치');
  });

  it('is not said, and no line is drawn to the place, when it is not known', () => {
    const answer = answerAt(AFTER, null);
    const index = answer.plans.findIndex(({ place }) => place.label === PICK);
    const drawing = drawingOf(answer, index);

    expect(seen(drawing, 'answer:me').label?.title).not.toMatch(/\d\d:\d\d|301동/u);
    expect(drawing.lines.map(({ id }) => id)).toEqual(['answer:route:1']);
    expect(drawing.things.filter(({ id }) => id.startsWith('answer:leg:0')).length).toBe(0);
  });
});

describe('where a face says it sets out from', () => {
  it('names the Class only while it is still to end', () => {
    const before = shown(answerAt(BEFORE)).plan;
    const after = shown(answerAt(AFTER)).plan;

    expect(before === undefined ? null : startOf(before)).toMatchObject({ kind: 'item', label: '301동 수업' });
    expect(after === undefined ? null : startOf(after)).toEqual({ kind: 'place', place: '301동' });
  });
});

// The answer with the User's way there not known, and with or without the way on to the next Class.
function noWayThere(answer: AnswerReply, withNext: boolean): AnswerReply {
  const plans = answer.plans.map((plan) => ({
    ...plan,
    parts: plan.parts.map((part) => (part.me ? Object.assign({}, part, { walkMinutes: null }) : part)),
    scene: withNext ? plan.scene : { ...plan.scene, routes: plan.scene.routes.filter(({ role }) => role !== 'next') },
  }));
  return { ...answer, plans };
}

// Partitions, the start not known: a next Class after the meal, whose way on every choice adds; no next Class either.
describe('the walking a choice adds with the start not known', () => {
  const unknown = answerAt(AFTER, null);

  // The chosen place's label says only its start since P04 ticket 74: the way is on the route's pill.
  it("is the way on to the next Class, on the tags, and the chosen place's label says its start", () => {
    const answer = noWayThere(unknown, true);
    const index = answer.plans.findIndex(({ place }) => place.label === PICK);
    const drawing = drawingOf(answer, index);

    expect(seen(drawing, 'answer:pick').label).toMatchObject({ note: '11:00' });
    expect(seen(drawing, 'answer:pick').name).toContain('걸음 17분');
    expect(minutesOf(drawing, '3식당')).toMatchObject({ title: '14분' });
  });

  it('is not said with no next Class either: a tag says its time', () => {
    const answer = noWayThere(unknown, false);
    const index = answer.plans.findIndex(({ place }) => place.label === PICK);
    const drawing = drawingOf(answer, index);

    expect(seen(drawing, 'answer:pick').label?.note).toBe('11:00');
    expect(minutesOf(drawing, '3식당')?.title).toMatch(/^\d{2}:\d{2}$/u);
  });
});
