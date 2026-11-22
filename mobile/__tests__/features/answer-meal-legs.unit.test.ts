/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import { crowdedMealAnswer } from '@/api/mock/data/crowded-meal';
import type { ViewArea } from '@/features/assistant/answer-camera';
import { labelBoxAt, type LabelView, overlaps } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOf } from '@/features/assistant/answer-marks';
import { inView, ZOOM_OFFSET } from '@/map';
import { lookName } from '@/map/marker-looks';
import { heldView, labelViewOf } from '@/screens/main/answer-framing';
import { LOWEST, SIZE, STATUS_BAR } from '../support/answer-view';

// The legs of a meal answer's route on the map (P04 ticket 39): a leg's minutes are a new mark when its words change,
// and the chosen place's label keeps clear of both legs and their minutes.
const CROWDED = crowdedMealAnswer('2026-10-07', '2026-10-06T04:00:00Z');
const at = (name: string): number => CROWDED.plans.findIndex(({ place }) => place.label === name);

// The emulator's answer screen with a meal answer docked: the time bar and the card as measured on it.
const FRAMING = {
  top: STATUS_BAR,
  card: 170,
  pill: true,
  timeBar: 110,
  view: { size: SIZE, closest: LOWEST + ZOOM_OFFSET.close },
};
const FIRST = labelViewOf(drawingOf(CROWDED, 0), FRAMING);

// The Plan's drawing at the view the app keeps for it while another place is chosen.
function chosen(index: number): { drawing: AnswerDrawing; view: LabelView } {
  const view = heldView(FIRST, drawingOf(CROWDED, index));
  if (view === null) {
    throw new Error('No view');
  }
  return { drawing: drawingOf(CROWDED, index, undefined, view), view };
}

function legsOf(drawing: AnswerDrawing): AnswerDrawing['things'] {
  return drawing.things.filter(({ id }) => id.startsWith('answer:leg:'));
}

function boxOf(view: LabelView, thing: AnswerDrawing['things'][number] | undefined): ViewArea {
  if (thing === undefined) {
    throw new Error('No such mark');
  }
  if (thing.look.kind !== 'answer' || thing.look.label === null) {
    throw new Error(`${thing.id} has no label`);
  }
  return labelBoxAt(view, thing.position, thing.look.label);
}

// Whether a box covers the straight line between two places at the view.
function crosses(view: LabelView, box: ViewArea, from: LatLng, to: LatLng): boolean {
  const one = inView(from, view.camera, view.size);
  const other = inView(to, view.camera, view.size);
  return Array.from({ length: 101 }, (_, step) => step / 100).some((share) => {
    const x = one.x + (other.x - one.x) * share;
    const y = one.y + (other.y - one.y) * share;
    return x > box.left && x < box.right && y > box.top && y < box.bottom;
  });
}

// Partitions: a leg whose words change with the choice (302동식당's 2분 by foot, then 자하연식당 2층's 셔틀 13분); a
// leg with the same words in both.
describe('a leg chosen with other words', () => {
  const before = legsOf(chosen(at('302동식당')).drawing);
  const after = legsOf(chosen(at('자하연식당 2층')).drawing);

  it('is a new mark with a new picture, so that the map never keeps the words before', () => {
    expect(before.map(({ id }) => id)).toEqual(['answer:leg:0:2분']);
    expect(after.map(({ id }) => id)).toEqual(['answer:leg:0:셔틀 13분', 'answer:leg:1:20분']);
    const [was] = before;
    const [now] = after;
    expect(was !== undefined && now !== undefined && lookName(now.look) !== lookName(was.look)).toBe(true);
  });

  it('keeps its mark when the words stay', () => {
    const third = legsOf(chosen(at('자하연식당 3층')).drawing);
    expect(third.map(({ id }) => id)).toContain('answer:leg:1:20분');
  });
});

// Partitions: every Plan of the crowded answer chosen, a short first leg (302동식당, 2 minutes) among them, a leg by
// shuttle (자하연식당 2층), and Plans with a way on.
describe.each(CROWDED.plans.map(({ place }) => place.label))('%s chosen', (name) => {
  const { drawing, view } = chosen(at(name));
  const plan = CROWDED.plans[at(name)];
  const legs = legsOf(drawing);
  const pick = drawing.things.find(({ id }) => id === 'answer:pick');

  it('draws each leg once, with its minutes', () => {
    const routes = (plan?.scene.routes ?? []).filter(({ role }) => role === 'me' || role === 'next');
    expect(legs).toHaveLength(routes.length);
  });

  it("keeps the chosen place's label clear of both legs and of their minutes", () => {
    const box = boxOf(view, pick);
    for (const { from, to } of plan?.scene.routes ?? []) {
      expect(crosses(view, box, from, to)).toBe(false);
    }
    for (const leg of legs) {
      expect(overlaps(box, boxOf(view, leg))).toBe(false);
    }
  });

  it('keeps the legs’ minutes clear of each other', () => {
    const [one, other] = legs;
    if (one !== undefined && other !== undefined) {
      expect(overlaps(boxOf(view, one), boxOf(view, other))).toBe(false);
    }
  });
});
