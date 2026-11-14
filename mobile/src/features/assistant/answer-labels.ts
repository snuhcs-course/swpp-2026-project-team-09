/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import { ANSWER_SYMBOL_BOX, type AnswerLabel, answerLabelBox, type LabelSide } from '@/design-system';
import { inView, type MapCamera, type Size } from '@/map';
import type { ViewArea } from './answer-camera';

const METRES_PER_DEGREE = 111_320;
// How far a label reaches from its point: sideways and how far up or down for a side label, up or down and how far
// sideways for one above or below.
const SIDE_REACH = { along: 400, across: 50 };
export const UPRIGHT_REACH = { along: 120, across: 150 };
// Labels at one side of marks this near each other share that side's outer edge.
const NEIGHBOURS = { upAndDown: 60, across: ANSWER_SYMBOL_BOX };
// A box this near the area's edge is inside it: a camera's fit rests in its last digits.
const ONE_POINT = 1;

// The metres east and north from one position to another.
export function offset(from: LatLng, to: LatLng): { east: number; north: number } {
  const north = (to.latitude - from.latitude) * METRES_PER_DEGREE;
  const east = (to.longitude - from.longitude) * METRES_PER_DEGREE * Math.cos((from.latitude * Math.PI) / 180);
  return { east, north };
}

// The camera an answer is shown at, its view's size, and the area of the view its labels stay in, in its points.
export interface LabelView {
  camera: MapCamera;
  size: Size;
  area: ViewArea;
}

// What a label says before it has a side.
export type Words = Omit<AnswerLabel, 'side'>;

// A mark at a point: its position, the words of its label, null for none, and the sides its label may take, in order.
export interface Unplaced {
  position: LatLng;
  words: Words | null;
  sides: readonly LabelSide[];
}

// Whether another point lies within a label's reach on that side of its point.
function blocked(at: LatLng, side: LabelSide, others: readonly LatLng[]): boolean {
  return others.some((other) => {
    const { east, north } = offset(at, other);
    const [along, across, reach] =
      side === 'right' || side === 'left'
        ? [side === 'right' ? east : -east, north, SIDE_REACH]
        : [side === 'above' ? north : -north, east, UPRIGHT_REACH];
    return along > 0 && along <= reach.along && Math.abs(across) <= reach.across;
  });
}

function boxIn(view: LabelView, position: LatLng, label: AnswerLabel): ViewArea {
  const { x, y } = inView(position, view.camera, view.size);
  const box = answerLabelBox(label);
  return { top: y + box.top, right: x + box.right, bottom: y + box.bottom, left: x + box.left };
}

function inside(view: LabelView, position: LatLng, label: AnswerLabel): boolean {
  const { top, right, bottom, left } = boxIn(view, position, label);
  const { area } = view;
  return (
    left >= area.left - ONE_POINT &&
    right <= area.right + ONE_POINT &&
    top >= area.top - ONE_POINT &&
    bottom <= area.bottom + ONE_POINT
  );
}

// The labels of the marks at one point, in the order they take sides, each at the first free side of its list: one
// no earlier label at the point took and no other point of the answer lies within its reach on. When no side is free,
// the first that no earlier label took; with none left, no label. At a view, a side whose box would leave the area is
// not in the list.
export function labelsAt(
  point: LatLng,
  others: readonly LatLng[],
  marks: readonly Unplaced[],
  view: LabelView | null,
): (AnswerLabel | null)[] {
  const taken = new Set<LabelSide>();
  return marks.map(({ position, words, sides }) => {
    if (words === null) {
      return null;
    }
    const list = sides.filter(
      (side) => !taken.has(side) && (view === null || inside(view, position, { ...words, side })),
    );
    const side = list.find((one) => !blocked(point, one, others)) ?? list[0];
    if (side === undefined) {
      return null;
    }
    taken.add(side);
    return { ...words, side };
  });
}

interface Laid {
  side: 'left' | 'right';
  x: number;
  y: number;
  box: ViewArea;
}

function laidOut(view: LabelView, position: LatLng, label: AnswerLabel | null): Laid | null {
  if (label?.side !== 'left' && label?.side !== 'right') {
    return null;
  }
  const { x, y } = inView(position, view.camera, view.size);
  return { side: label.side, x, y, box: boxIn(view, position, label) };
}

// How far, in whole points, a label at the left or the right of its mark moves away from it: labels at the left of
// marks within 60 points of each other up and down and a symbol box across share the right edge furthest out among
// them, and those at the right the left edge, as far as the area lets each move.
function shiftOf(one: Laid, all: readonly (Laid | null)[], area: ViewArea): number {
  const neighbours = all.filter(
    (other): other is Laid =>
      other?.side === one.side &&
      Math.abs(other.y - one.y) <= NEIGHBOURS.upAndDown &&
      Math.abs(other.x - one.x) <= NEIGHBOURS.across,
  );
  if (one.side === 'left') {
    const edge = Math.min(...neighbours.map(({ box }) => box.right));
    return Math.min(Math.round(one.box.right - edge), Math.floor(one.box.left - area.left));
  }
  const edge = Math.max(...neighbours.map(({ box }) => box.left));
  return Math.min(Math.round(edge - one.box.left), Math.floor(area.right - one.box.right));
}

// The labels at a view with the edges they share at the left and the right of their marks: a label that moves carries
// its `shift`. With no view, the labels as they are.
export function sharedEdges(
  view: LabelView | null,
  marks: readonly { position: LatLng; label: AnswerLabel | null }[],
): (AnswerLabel | null)[] {
  if (view === null) {
    return marks.map(({ label }) => label);
  }
  const laid = marks.map(({ position, label }) => laidOut(view, position, label));
  return marks.map(({ label }, index) => {
    const one = laid[index];
    const shift = one === null || one === undefined ? 0 : shiftOf(one, laid, view.area);
    return label === null || shift <= 0 ? label : { ...label, shift };
  });
}
