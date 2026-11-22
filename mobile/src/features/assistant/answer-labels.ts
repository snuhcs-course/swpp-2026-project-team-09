/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import { ANSWER_SYMBOL_BOX, type AnswerLabel, answerLabelBox, type LabelSide } from '@/design-system';
import { inView, type MapCamera, type Size } from '@/map';
import type { ViewArea } from './answer-camera';
import { offset } from './answer-drawing';

// How far a label reaches from its point: sideways and how far up or down for a side label, up or down and how far
// sideways for one above or below.
const SIDE_REACH = { along: 400, across: 50 };
export const UPRIGHT_REACH = { along: 120, across: 150 };
// Labels at one side of marks this near each other share that side's outer edge.
const NEIGHBOURS = { upAndDown: 60, across: ANSWER_SYMBOL_BOX };
// A box or a point this near the area's edge is inside it, and a move of less is none: a camera's fit rests in its
// last digits.
export const ONE_POINT = 1;

// The camera an answer is shown at, its view's size, and the area of the view its labels stay in, in its points.
export interface LabelView {
  camera: MapCamera;
  size: Size;
  area: ViewArea;
  // Faces drawn over the map that labels keep clear of, as Friends' Avatars; left out, none.
  avoid?: readonly LatLng[];
}

// What a label says before it has a side.
export type Words = Omit<AnswerLabel, 'side'>;

// A point of an answer's marks, and the position of the one symbol drawn there, null for none.
export interface MarkPoint {
  position: LatLng;
  symbol: LatLng | null;
}

// A mark that may take a label: the index of its point, its own position, the words of its label, null for none, and
// the sides its label may take, in order. `kept`: the pick's, whose label is never left out.
export interface Unplaced {
  point: number;
  position: LatLng;
  words: Words | null;
  sides: readonly LabelSide[];
  kept?: boolean;
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

// A Friend's face over the map: a pin standing on its point, about 44 points wide and 52 high.
const FACE = { half: 22, above: 52, below: 4 };

export function faceBox(view: LabelView, position: LatLng): ViewArea {
  const { x, y } = inView(position, view.camera, view.size);
  return { top: y - FACE.above, right: x + FACE.half, bottom: y + FACE.below, left: x - FACE.half };
}

// A label's box at a view, around its mark's point.
export function labelBoxAt(view: LabelView, position: LatLng, label: AnswerLabel): ViewArea {
  return boxIn(view, position, label);
}

function symbolBox(view: LabelView, position: LatLng): ViewArea {
  const { x, y } = inView(position, view.camera, view.size);
  const half = ANSWER_SYMBOL_BOX / 2;
  return { top: y - half, right: x + half, bottom: y + half, left: x - half };
}

export function inside({ top, right, bottom, left }: ViewArea, area: ViewArea): boolean {
  return (
    left >= area.left - ONE_POINT &&
    right <= area.right + ONE_POINT &&
    top >= area.top - ONE_POINT &&
    bottom <= area.bottom + ONE_POINT
  );
}

export function overlaps(one: ViewArea, other: ViewArea): boolean {
  return one.left < other.right && other.left < one.right && one.top < other.bottom && other.top < one.bottom;
}

function othersThan(symbols: readonly (ViewArea | null)[], point: number): ViewArea[] {
  return symbols.filter((box, at): box is ViewArea => box !== null && at !== point);
}

// The first side of a list with no other point within its reach in metres, or else the first.
function inMetres(points: readonly MarkPoint[], point: number, list: readonly LabelSide[]): LabelSide | null {
  const at = points[point]?.position;
  if (at === undefined) {
    return null;
  }
  const others = points.filter((_, other) => other !== point).map(({ position }) => position);
  return list.find((one) => !blocked(at, one, others)) ?? list[0] ?? null;
}

// The first side of a list whose box stays inside the area and covers none of `covering`, or none.
function atView(
  view: LabelView,
  position: LatLng,
  words: Words,
  list: readonly LabelSide[],
  covering: readonly ViewArea[],
): LabelSide | null {
  const side = list.find((one) => {
    const box = boxIn(view, position, { ...words, side: one });
    return inside(box, view.area) && !covering.some((other) => overlaps(box, other));
  });
  return side ?? null;
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

// The labels with the edges they share at the left and the right of their marks, taken in order: a label that moves
// carries its `shift`, unless it would then cover another point's symbol or another label where that label stands
// then, moved or not.
function sharedEdges(
  view: LabelView,
  marks: readonly Unplaced[],
  labels: readonly (AnswerLabel | null)[],
  symbols: readonly (ViewArea | null)[],
): (AnswerLabel | null)[] {
  const positions = labels.map((_, index) => marks[index]?.position);
  const laid = labels.map((label, index) => {
    const position = positions[index];
    return position === undefined ? null : laidOut(view, position, label);
  });
  const boxes = labels.map((label, index) => {
    const position = positions[index];
    return label === null || position === undefined ? null : boxIn(view, position, label);
  });
  return labels.map((label, index) => {
    const one = laid[index];
    const mark = marks[index];
    const shift = one === null || one === undefined ? 0 : shiftOf(one, laid, view.area);
    if (label === null || mark === undefined || shift <= 0) {
      return label;
    }
    const moved = { ...label, shift };
    const box = boxIn(view, mark.position, moved);
    const others = boxes.filter((other, otherAt): other is ViewArea => other !== null && otherAt !== index);
    if ([...othersThan(symbols, mark.point), ...others].some((other) => overlaps(box, other))) {
      return label;
    }
    boxes[index] = box;
    return moved;
  });
}

// The sides a kept label may also take when none of its own stays inside the area, as a pick near the screen's edge.
const SIDEWAYS: readonly LabelSide[] = ['left', 'right'];

// The side a kept label takes at a view where none is free: the first whose box stays inside the area, else the left
// or the right that does and that no other label at its point took, else the first.
function keptAt(
  view: LabelView,
  position: LatLng,
  words: Words,
  list: readonly LabelSide[],
  taken: ReadonlySet<LabelSide>,
): LabelSide | null {
  const sideways = SIDEWAYS.filter((side) => !list.includes(side) && !taken.has(side));
  return atView(view, position, words, list, []) ?? atView(view, position, words, sideways, []) ?? list[0] ?? null;
}

// The labels of an answer's marks, taken in the order given, each at a side of its list that no earlier label at its
// point took. Without a view, the first side with no other point within its reach in metres, or with none such the
// first. At a view, the first whose box stays inside the area and covers neither another point's symbol box nor a
// label placed before it, or with none such no label, except a kept one's (`keptAt`); labels at the left and the
// right of neighbouring marks then share an edge.
export function placeLabels(
  points: readonly MarkPoint[],
  marks: readonly Unplaced[],
  view: LabelView | null,
): (AnswerLabel | null)[] {
  const taken = points.map(() => new Set<LabelSide>());
  const symbols = view === null ? [] : points.map(({ symbol }) => (symbol === null ? null : symbolBox(view, symbol)));
  const faces = view === null ? [] : (view.avoid ?? []).map((position) => faceBox(view, position));
  const boxes: ViewArea[] = [];
  const labels = marks.map(({ point, position, words, sides, kept = false }): AnswerLabel | null => {
    const free = taken[point];
    if (words === null || free === undefined) {
      return null;
    }
    const list = sides.filter((side) => !free.has(side));
    const covering = [...othersThan(symbols, point), ...boxes, ...faces];
    const side =
      view === null
        ? inMetres(points, point, list)
        : (atView(view, position, words, list, covering) ?? (kept ? keptAt(view, position, words, list, free) : null));
    if (side === null) {
      return null;
    }
    free.add(side);
    const label = { ...words, side };
    if (view !== null) {
      boxes.push(boxIn(view, position, label));
    }
    return label;
  });
  return view === null ? labels : sharedEdges(view, marks, labels, symbols);
}
