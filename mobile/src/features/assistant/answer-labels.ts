/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import { ANSWER_SYMBOL_BOX, type AnswerLabel, type LabelSide } from '@/design-system';
import { inView, type MapCamera, type Size } from '@/map';
import type { ViewArea } from './answer-camera';
import { offset } from './answer-drawing';
import { boxIn, faceBox, lineBoxes, othersThan, overlaps, sideAtView, symbolBoxes } from './answer-label-fits';

export { faceBox, inside, ONE_POINT, overlaps } from './answer-label-fits';

// How far a label reaches from its point: sideways and how far up or down for a side label, up or down and how far
// sideways for one above or below.
const SIDE_REACH = { along: 400, across: 50 };
export const UPRIGHT_REACH = { along: 120, across: 150 };
// Labels at one side of marks this near each other share that side's outer edge.
const NEIGHBOURS = { upAndDown: 60, across: ANSWER_SYMBOL_BOX };

// The camera an answer is shown at, its view's size, and the area of the view its labels stay in, in its points.
export interface LabelView {
  camera: MapCamera;
  size: Size;
  area: ViewArea;
  // Faces drawn over the map that labels keep clear of, as Friends' Avatars; left out, none.
  avoid?: readonly LatLng[];
  // The phone's font size as a share of the usual, which the labels' words are drawn at; left out, 1.
  fontScale?: number;
  // Controls over the map that labels keep clear of, as the round "←" under the time bar; left out, none.
  blocked?: readonly ViewArea[];
}

// What a label says before it has a side.
export type Words = Omit<AnswerLabel, 'side'>;

// A point of an answer's marks, and the position of the one symbol drawn there, null for none.
export interface MarkPoint {
  position: LatLng;
  symbol: LatLng | null;
  // The symbol is a person's, the User's own or a Friend's face, which a tag that gives way keeps clear of.
  person?: boolean;
}

// A mark that may take a label: the index of its point, its own position, the words of its label, null for none, and
// the sides its label may take, in order. `kept`: the pick's, whose label is never left out. `clearOf`: lines its
// label keeps clear of. `either`: of the marks with the same, only the first placed takes a label.
export interface Unplaced {
  point: number;
  position: LatLng;
  words: Words | null;
  sides: readonly LabelSide[];
  kept?: boolean;
  clearOf?: readonly (readonly LatLng[])[];
  either?: string;
  // A label that may stand over a face (`LabelView.avoid`).
  overFaces?: boolean;
  // A kept tag that gives way to the other labels: where no side is clear of them, it keeps its number only, or none.
  shrinks?: boolean;
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

// A label's box at a view, around its mark's point.
export function labelBoxAt(view: LabelView, position: LatLng, label: AnswerLabel): ViewArea {
  return boxIn(view, position, label);
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
    const controls = view.blocked ?? [];
    if ([...othersThan(symbols, mark.point), ...others, ...controls].some((other) => overlaps(box, other))) {
      return label;
    }
    boxes[index] = box;
    return moved;
  });
}

// What the labels placed so far and the marks leave a label: the symbols' boxes, the people's, the faces', and the
// labels', and the sides its point's other labels took.
interface Placing {
  symbols: readonly (ViewArea | null)[];
  pins: readonly (ViewArea | null)[];
  faces: readonly ViewArea[];
  boxes: readonly ViewArea[];
  free: ReadonlySet<LabelSide>;
  pinned: boolean;
}

// The side and the words of one mark's label: in metres without a view, else at the view (`sideAtView`).
function placeOne(
  view: LabelView | null,
  points: readonly MarkPoint[],
  {
    point,
    position,
    words,
    kept = false,
    clearOf = [],
    overFaces = false,
    shrinks = false,
  }: Unplaced & { words: Words },
  list: readonly LabelSide[],
  { symbols, pins, faces, boxes, free, pinned }: Placing,
): { side: LabelSide; words: Words } | null {
  if (view === null) {
    const side = inMetres(points, point, list);
    return side === null ? null : { side, words };
  }
  const lines = lineBoxes(view, clearOf);
  const rooms = {
    covering: [...othersThan(symbols, point), ...boxes, ...(overFaces ? [] : faces), ...lines],
    clear: [...othersThan(pins, point), ...boxes, ...faces, ...lines],
    labels: [...boxes, ...lines],
    taken: free,
    pinned,
  };
  return sideAtView(view, position, words, list, rooms, { kept, shrinks });
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
  const symbols = view === null ? [] : symbolBoxes(view, points, () => true);
  const faces = view === null ? [] : (view.avoid ?? []).map((position) => faceBox(view, position));
  // The people's marks, the User's own and the Friends' faces, which a label that gives way keeps clear of too.
  const pins = view === null ? [] : symbolBoxes(view, points, ({ person = false }) => person);
  const pinned = pins.some((pin) => pin !== null);
  const boxes: ViewArea[] = [...(view?.blocked ?? [])];
  const placedEither = new Set<string>();
  const labels = marks.map((mark): AnswerLabel | null => {
    const { point, position, words, sides, either } = mark;
    const free = taken[point];
    if (words === null || free === undefined || (either !== undefined && placedEither.has(either))) {
      return null;
    }
    const list = sides.filter((side) => !free.has(side));
    const placed = placeOne(view, points, { ...mark, words }, list, { symbols, pins, faces, boxes, free, pinned });
    if (placed === null) {
      return null;
    }
    if (either !== undefined) {
      placedEither.add(either);
    }
    free.add(placed.side);
    const label = { ...placed.words, side: placed.side };
    if (view !== null) {
      boxes.push(boxIn(view, position, label));
    }
    return label;
  });
  return view === null ? labels : sharedEdges(view, marks, labels, symbols);
}
