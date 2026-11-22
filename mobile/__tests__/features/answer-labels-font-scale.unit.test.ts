/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { crowdedMealAnswer } from '@/api/mock/data/crowded-meal';
import { B301 } from '@/api/mock/data/crowded-restaurants';
import type { LatLng } from '@/api/types';
import { ANSWER_SYMBOL_BOX, answerLabelBox } from '@/design-system';
import type { ViewArea } from '@/features/assistant/answer-camera';
import { faceBox, labelBoxAt, type LabelView, overlaps } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOf } from '@/features/assistant/answer-marks';
import { inView, ZOOM_OFFSET } from '@/map';
import { heldView, labelViewOf } from '@/screens/main/answer-framing';
import { LOWEST, SIZE, STATUS_BAR } from '../support/answer-view';

// The labels of a meal answer on a phone with a large system font (P04 ticket 52): a meal from 301동 with one Friend
// who also starts there, at a font scale of 1.3. No label covers another label, the User's own mark, or the Friend's
// face.
const FONT_SCALE = 1.3;
const FRIEND = { latitude: B301.latitude + 0.00018, longitude: B301.longitude + 0.00012 };

// The phone's answer: a few places near 301동 (302동식당 a short walk away), the User and the Friend starting there.
const NEAR = new Set(['302동식당', '301동식당', '3식당', '두레미담', '학생회관식당']);

function withFriendIn(scene: AnswerReply['plans'][number]['scene']): AnswerReply['plans'][number]['scene'] {
  return {
    ...scene,
    places: scene.places.filter(({ role, place }) => role === 'next' || NEAR.has(place.label)),
    people: [
      ...scene.people,
      { userId: 'friend-taehyun', name: '태현', me: false, at: FRIEND, source: 'timetable', tag: null },
    ],
  };
}

function withFriend(answer: AnswerReply): AnswerReply {
  const plans = answer.plans.filter(({ place }) => NEAR.has(place.label));
  return {
    ...answer,
    plans: plans.map((plan) => Object.assign({}, plan, { scene: withFriendIn(plan.scene) })),
  };
}

const ANSWER = withFriend(crowdedMealAnswer('2026-10-07', '2026-10-06T04:00:00Z'));
const FRAMING = {
  top: STATUS_BAR,
  card: 220,
  pill: true,
  timeBar: 110,
  view: { size: SIZE, closest: LOWEST + ZOOM_OFFSET.close },
  fontScale: FONT_SCALE,
};
const FIRST = labelViewOf(drawingOf(ANSWER, 0), FRAMING);

function chosen(index: number): { drawing: AnswerDrawing; view: LabelView } {
  const view = heldView(FIRST, drawingOf(ANSWER, index));
  if (view === null) {
    throw new Error('No view');
  }
  return { drawing: drawingOf(ANSWER, index, undefined, view), view };
}

interface Box {
  id: string;
  box: ViewArea;
}

function labelBoxes({ things }: AnswerDrawing, view: LabelView): Box[] {
  return things.flatMap(({ id, position, look }) =>
    look.kind === 'answer' && look.label !== null ? [{ id, box: labelBoxAt(view, position, look.label) }] : [],
  );
}

function symbolBoxes({ things }: AnswerDrawing, view: LabelView): Box[] {
  return things.flatMap(({ id, position, look }): Box[] => {
    if (look.kind !== 'answer' || look.symbol === null) {
      return [];
    }
    if (look.symbol.type === 'face') {
      return [{ id, box: faceBox(view, position) }];
    }
    const { x, y } = inView(position, view.camera, view.size);
    const half = ANSWER_SYMBOL_BOX / 2;
    return [{ id, box: { top: y - half, right: x + half, bottom: y + half, left: x - half } }];
  });
}

function near(one: LatLng, other: LatLng): boolean {
  return Math.abs(one.latitude - other.latitude) < 0.00014 && Math.abs(one.longitude - other.longitude) < 0.00017;
}

// Partitions: every Plan of the answer chosen, the pick at the start's building (301동식당) and a short walk from it
// (302동식당) among them.
describe.each(ANSWER.plans.map(({ place }) => place.label))('%s chosen, at a font scale of 1.3', (name) => {
  const { drawing, view } = chosen(ANSWER.plans.findIndex(({ place }) => place.label === name));
  const labels = labelBoxes(drawing, view);

  it('draws no label over another', () => {
    const covering = labels.flatMap((one, at) =>
      labels.slice(at + 1).flatMap((other) => (overlaps(one.box, other.box) ? [`${one.id} × ${other.id}`] : [])),
    );
    expect(covering).toEqual([]);
  });

  it("draws no label over the User's own mark or the Friend's face", () => {
    const things = new Map(drawing.things.map((thing) => [thing.id, thing.position]));
    const people = symbolBoxes(drawing, view).filter(({ id }) => id === 'answer:me' || id.startsWith('answer:person:'));
    const covering = labels.flatMap((label) =>
      people.flatMap((symbol) => {
        const mine = near(things.get(label.id) ?? B301, things.get(symbol.id) ?? FRIEND);
        return !mine && overlaps(label.box, symbol.box) ? [`${label.id} × ${symbol.id}`] : [];
      }),
    );
    // The chosen place's label never moves: chosen at the start's own building, with the Friend's face beside it and
    // the way on below it, it has no side clear of both, and stands over the face.
    expect(covering).toEqual(name === '301동식당' ? ['answer:pick × answer:person:friend-taehyun'] : []);
  });
});

describe('a label at a font scale of 1.3', () => {
  it('is as much wider and taller as its words are drawn larger', () => {
    const label = { side: 'right' as const, tone: 'meeting' as const, title: '10:45 301동', line: null, number: null };
    const usual = answerLabelBox(label);
    const large = answerLabelBox(label, FONT_SCALE);
    expect(large.right - large.left).toBeGreaterThan((usual.right - usual.left) * 1.2);
    expect(large.bottom - large.top).toBeGreaterThan(usual.bottom - usual.top);
  });
});
