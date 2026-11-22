/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { crowdedMealAnswer } from '@/api/mock/data/crowded-meal';
import type { LatLng } from '@/api/types';
import { metresBetween } from '@/features/assistant/answer-drawing';
import { faceBox, labelBoxAt, type LabelView, overlaps } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOf } from '@/features/assistant/answer-marks';
import { routeLineId } from '@/features/assistant/answer-walks';
import { type MapAvatar, unmadeImage, ZOOM_OFFSET } from '@/map';
import { heldView, labelViewOf } from '@/screens/main/answer-framing';
import { facesClearOf } from '@/screens/main/use-answer-faces';
import { LOWEST, SIZE, STATUS_BAR } from '../support/answer-view';

// A meal answer's legs say their minutes on the paths drawn (P04 ticket 41), clear of the Friends' faces where they
// can, and a face that stands over them gives way.
const CROWDED = crowdedMealAnswer('2026-10-07', '2026-10-06T04:00:00Z');
const CHOSEN = CROWDED.plans.findIndex(({ place }) => place.label === '자하연식당 2층');
const PLAN = CROWDED.plans[CHOSEN];
const FRAMING = {
  top: STATUS_BAR,
  card: 170,
  pill: true,
  timeBar: 110,
  view: { size: SIZE, closest: LOWEST + ZOOM_OFFSET.close },
};
const HELD = heldView(labelViewOf(drawingOf(CROWDED, 0), FRAMING), drawingOf(CROWDED, CHOSEN));
const WAY_ON = 1;
const LEG = 'answer:leg:1:20분';

function route(index: number): { from: LatLng; to: LatLng } {
  const one = PLAN?.scene.routes[index];
  if (one === undefined) {
    throw new Error(`No route ${String(index)}`);
  }
  return one;
}

function viewWith(avoid: readonly LatLng[] = []): LabelView {
  if (HELD === null) {
    throw new Error('No view');
  }
  return { ...HELD, avoid };
}

function legOf(drawing: AnswerDrawing): AnswerDrawing['things'][number] {
  const leg = drawing.things.find(({ id }) => id === LEG);
  if (leg === undefined) {
    throw new Error('No leg');
  }
  return leg;
}

function labelBox(view: LabelView, thing: AnswerDrawing['things'][number]): ReturnType<typeof labelBoxAt> {
  if (thing.look.kind !== 'answer' || thing.look.label === null) {
    throw new Error(`${thing.id} has no label`);
  }
  return labelBoxAt(view, thing.position, thing.look.label);
}

// How far a point is from a line of straight pieces, in metres, by the nearest of points every metre along it.
function offLine(point: LatLng, line: readonly LatLng[]): number {
  let nearest = Infinity;
  for (const [at, from] of line.slice(0, -1).entries()) {
    const to = line[at + 1] ?? from;
    const steps = Math.max(1, Math.ceil(metresBetween(from, to)));
    for (let step = 0; step <= steps; step += 1) {
      const share = step / steps;
      const on = {
        latitude: from.latitude + (to.latitude - from.latitude) * share,
        longitude: from.longitude + (to.longitude - from.longitude) * share,
      };
      nearest = Math.min(nearest, metresBetween(point, on));
    }
  }
  return nearest;
}

// The way on to 302동 found along a path that bends 250 metres east of the straight line.
const { from, to } = route(WAY_ON);
const BEND = {
  latitude: (from.latitude + to.latitude) / 2,
  longitude: (from.longitude + to.longitude) / 2 + 250 / 88_200,
};
const PATH = [from, BEND, to];
const PATHS = { paths: new Map([[routeLineId(WAY_ON), PATH]]), legs: [] };

// Partitions: the way on drawn straight (no path found yet); along a bent path once found.
describe("the way on's minutes", () => {
  it('stand on the straight line while no path is found', () => {
    const leg = legOf(drawingOf(CROWDED, CHOSEN, undefined, viewWith()));
    expect(offLine(leg.position, [from, to])).toBeLessThan(1);
  });

  it('stand on the path drawn once it is found, away from the straight line', () => {
    const leg = legOf(drawingOf(CROWDED, CHOSEN, undefined, viewWith(), PATHS));
    expect(offLine(leg.position, PATH)).toBeLessThan(1);
    expect(offLine(leg.position, [from, to])).toBeGreaterThan(50);
  });
});

// Partitions: a face where the minutes would stand, with room elsewhere along the leg; a face over the minutes wherever
// they stand, which gives way.
describe('a face on the leg', () => {
  it('is kept clear of where another place along the leg is free', () => {
    const straight = legOf(drawingOf(CROWDED, CHOSEN, undefined, viewWith(), PATHS));
    const view = viewWith([straight.position]);
    const leg = legOf(drawingOf(CROWDED, CHOSEN, undefined, view, PATHS));
    expect(overlaps(labelBox(view, leg), faceBox(view, straight.position))).toBe(false);
  });

  it('gives way when it stands over the minutes', () => {
    const view = viewWith();
    const drawing = drawingOf(CROWDED, CHOSEN, undefined, view, PATHS);
    const leg = legOf(drawing);
    const over: MapAvatar = {
      id: 'avatar:friend',
      name: '태오',
      position: leg.position,
      image: unmadeImage({ kind: 'me' }),
      glideMs: 0,
    };
    expect(overlaps(labelBox(view, leg), faceBox(view, leg.position))).toBe(true);
    expect(facesClearOf([over], drawing, view)).toEqual([]);
  });
});
