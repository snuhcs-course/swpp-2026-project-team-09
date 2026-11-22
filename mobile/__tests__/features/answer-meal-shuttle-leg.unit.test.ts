/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { crowdedMealAnswer } from '@/api/mock/data/crowded-meal';
import { SHUTTLE } from '@/api/mock/data/shuttle';
import type { LatLng } from '@/api/types';
import { metresBetween } from '@/features/assistant/answer-drawing';
import { drawingOf } from '@/features/assistant/answer-marks';
import { withDots } from '@/features/assistant/meal-marks';
import { BY_SHUTTLE, rideBetween, shuttleLegsOf, shuttleWalks } from '@/features/assistant/shuttle-legs';
import { ZOOM_OFFSET } from '@/map';
import { heldView, labelViewOf } from '@/screens/main/answer-framing';
import { seen } from '../support/answer-marks';
import { LOWEST, SIZE, STATUS_BAR } from '../support/answer-view';

// A meal Plan's leg by the shuttle drawn as the User goes it (P04 ticket 41): the walk to the stop, the ride along the
// shuttle's road line, and the walk from the stop, with the stops marked and named and its minutes on the ride.
const CROWDED = crowdedMealAnswer('2026-10-07', '2026-10-06T04:00:00Z');
const CHOSEN = CROWDED.plans.findIndex(({ place }) => place.label === '자하연식당 2층');
const PLAN = CROWDED.plans[CHOSEN];
if (PLAN === undefined) {
  throw new Error('No 자하연식당 2층');
}
const LEGS = shuttleLegsOf(PLAN, SHUTTLE);
const WAYS = { paths: new Map<string, LatLng[]>(), legs: LEGS };
const FRAMING = {
  top: STATUS_BAR,
  card: 170,
  pill: true,
  timeBar: 110,
  view: { size: SIZE, closest: LOWEST + ZOOM_OFFSET.close },
};
const VIEW = heldView(labelViewOf(drawingOf(CROWDED, 0), FRAMING), drawingOf(CROWDED, CHOSEN, undefined, null, WAYS));

function stop(name: string): LatLng {
  const one = SHUTTLE.stops.find((each) => each.name === name);
  if (one === undefined) {
    throw new Error(`No stop ${name}`);
  }
  return { latitude: one.latitude, longitude: one.longitude };
}

// How far a point is from a line, in metres, by its nearest of points every metre along it.
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

describe('the way to 자하연식당 2층 by the shuttle', () => {
  const drawing = drawingOf(CROWDED, CHOSEN, undefined, VIEW, WAYS);
  const [leg] = LEGS;

  it('boards and gets off at the stops the Plan names', () => {
    expect(LEGS.map(({ index, board, getOff }) => [index, board.name, getOff.name])).toEqual([
      [0, '301동', '기숙사삼거리'],
    ]);
  });

  it('is drawn as a walk to the stop, the ride along the roads, and a walk from the stop, never one straight line', () => {
    const ids = drawing.lines.map(({ id }) => id);
    expect(ids).toEqual(['answer:route:0:in', 'answer:route:0:ride', 'answer:route:0:out', 'answer:route:1']);
    const ride = drawing.lines[1];
    expect(ride?.points.length).toBeGreaterThan(10);
    expect(ride?.points[0]).toEqual(stop('301동'));
    expect(ride?.points.at(-1)).toEqual(stop('기숙사삼거리'));
    expect(ride?.style.color).toBe(BY_SHUTTLE.color);
    expect(drawing.lines[0]?.points).toEqual([PLAN.scene.routes[0]?.from, stop('301동')]);
    expect(drawing.lines[2]?.points).toEqual([stop('기숙사삼거리'), PLAN.scene.routes[0]?.to]);
  });

  it('asks for the paths of its two walks', () => {
    expect(shuttleWalks(LEGS).map(({ lineId }) => lineId)).toEqual(['answer:route:0:in', 'answer:route:0:out']);
  });

  it('marks and names its two stops', () => {
    expect(seen(drawing, 'answer:board:0').label).toMatchObject({ tone: 'stop', title: '301동 승차' });
    expect(seen(drawing, 'answer:get-off:0').label).toMatchObject({ tone: 'stop', title: '기숙사삼거리 하차' });
  });

  it('says "셔틀 13분" on the ride', () => {
    const label = drawing.things.find(({ id }) => id === 'answer:leg:0:셔틀 13분');
    expect(label).toBeDefined();
    expect(offLine(label?.position ?? stop('정문'), leg?.ride ?? [])).toBeLessThan(1);
  });
});

// Partitions: the shuttle's route not loaded yet; a ride past the loop's start.
describe('a leg by the shuttle without its stops', () => {
  it('is a dotted line in the shuttle colour, not a solid one', () => {
    const drawing = drawingOf(CROWDED, CHOSEN);
    const [line] = drawing.lines;
    expect(line?.style).toBe(BY_SHUTTLE);
    const dots = withDots(drawing.lines.slice(0, 1));
    expect(dots.length).toBeGreaterThan(10);
    expect(dots.every(({ style }) => style.color === BY_SHUTTLE.color)).toBe(true);
  });
});

describe("a ride past the loop's start", () => {
  it('goes on around the loop from its end to its start', () => {
    const from = SHUTTLE.stops.find(({ name }) => name === '경영대');
    const to = SHUTTLE.stops.find(({ name }) => name === '법과대');
    const ride = from === undefined || to === undefined ? [] : rideBetween(SHUTTLE.line, from, to);
    const length = ride.slice(1).reduce((total, point, at) => total + metresBetween(ride[at] ?? point, point), 0);
    expect(length).toBeGreaterThan(300);
    expect(length).toBeLessThan(2000);
  });
});
