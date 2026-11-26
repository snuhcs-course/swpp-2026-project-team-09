/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import { ANSWER_SYMBOL_BOX, type AnswerLabel, answerLabelBox, type LabelSide } from '@/design-system';
import { inView } from '@/map';
import type { ViewArea } from './answer-camera';
import type { LabelView, MarkPoint, Words } from './answer-labels';

// Where a label fits at a view (`placeLabels`): the boxes of labels, symbols, faces, and lines, and the side a label
// takes among them, with the fallbacks of a label that is never left out.

// A box or a point this near the area's edge is inside it, and a move of less is none: a camera's fit rests in its
// last digits.
export const ONE_POINT = 1;

// A tag with its number only.
function numberOnly(words: Words): Words {
  const { tone, number } = words;
  return { tone, title: '', line: null, number };
}

// The side and the words of a kept tag that gives way (`shrinks`): its words at a side clear of the labels, the faces,
// and the lines, though over a dot; else its number only, clear of the dots too if it can be, or wherever it stays in
// the area (`keptAt`): a tag held at a shared point has no dot of its own, so its number is never left out.
export function shrunk(
  view: LabelView,
  position: LatLng,
  words: Words,
  list: readonly LabelSide[],
  {
    covering,
    clear,
    labels,
    taken,
  }: {
    covering: readonly ViewArea[];
    clear: readonly ViewArea[];
    labels: readonly ViewArea[];
    taken: ReadonlySet<LabelSide>;
  },
): { side: LabelSide; words: Words } | null {
  const whole = atView(view, position, words, list, clear);
  if (whole !== null) {
    return { side: whole, words };
  }
  const small = numberOnly(words);
  const side =
    atView(view, position, small, list, covering) ??
    atView(view, position, small, list, clear) ??
    keptAt(view, position, small, list, taken, labels);
  return side === null ? null : { side, words: small };
}

export function boxIn(view: LabelView, position: LatLng, label: AnswerLabel): ViewArea {
  const { x, y } = inView(position, view.camera, view.size);
  const box = answerLabelBox(label, view.fontScale);
  return { top: y + box.top, right: x + box.right, bottom: y + box.bottom, left: x + box.left };
}

// A Friend's face drawn over the map by the map itself (`LabelView.avoid`, an everyday Avatar): a pin standing on its
// point, about 44 points wide and 52 high. A face that is a mark's symbol is a circle on its point, as a dot is.
const FACE = { half: 22, above: 52, below: 4 };

export function faceBox(view: LabelView, position: LatLng): ViewArea {
  const { x, y } = inView(position, view.camera, view.size);
  return { top: y - FACE.above, right: x + FACE.half, bottom: y + FACE.below, left: x - FACE.half };
}

// A line at a view as small boxes along it, every few points, as wide as a route is drawn.
const LINE = { every: 6, half: 4 };

export function lineBoxes(view: LabelView, lines: readonly (readonly LatLng[])[]): ViewArea[] {
  const boxes: ViewArea[] = [];
  for (const line of lines) {
    const points = line.map((point) => inView(point, view.camera, view.size));
    points.slice(1).forEach((to, at) => {
      const from = points[at] ?? to;
      const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / LINE.every));
      for (let step = 0; step <= steps; step += 1) {
        const x = from.x + ((to.x - from.x) * step) / steps;
        const y = from.y + ((to.y - from.y) * step) / steps;
        boxes.push({ top: y - LINE.half, right: x + LINE.half, bottom: y + LINE.half, left: x - LINE.half });
      }
    });
  }
  return boxes;
}

export function symbolBox(view: LabelView, position: LatLng): ViewArea {
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

export function othersThan(symbols: readonly (ViewArea | null)[], point: number): ViewArea[] {
  return symbols.filter((box, at): box is ViewArea => box !== null && at !== point);
}

// The first side of a list whose box stays inside the area and covers none of `covering`, or none.
export function atView(
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

// The sides a kept label may also take when none of its own stays inside the area, as a pick near the screen's edge.
const SIDEWAYS: readonly LabelSide[] = ['left', 'right'];

// The side a kept label takes at a view where none is free: the first that covers no line it keeps clear of nor a label
// placed before it, else the first whose box stays inside the area, else the left or the right that does and that no
// other label at its point took, else the first.
export function keptAt(
  view: LabelView,
  position: LatLng,
  words: Words,
  list: readonly LabelSide[],
  taken: ReadonlySet<LabelSide>,
  clear: readonly ViewArea[],
): LabelSide | null {
  const sideways = SIDEWAYS.filter((side) => !list.includes(side) && !taken.has(side));
  return (
    (clear.length > 0 ? atView(view, position, words, list, clear) : null) ??
    atView(view, position, words, list, []) ??
    atView(view, position, words, sideways, []) ??
    list[0] ??
    null
  );
}

// A meal pick's label with its name and time alone, one line, narrower than with its dish under them (P04 ticket 89).
function oneLine(words: Words): Words {
  return { ...words, line: null, action: null };
}

function covered(box: ViewArea, others: readonly ViewArea[]): number {
  return others.filter((other) => overlaps(box, other)).length;
}

// Where no side is clear of everything, a meal pick's label (P04 ticket 89), never left out: on one line at a side
// clear of everything; else, of its sides whose box stays inside the area, two lines or one, the one clear of the
// people's marks, the labels, the faces, and the lines where one is, then over the fewest other rounds, two lines before
// one on a tie, its sides in their order. A round so is under it only where every way it fits covers one; a candidate's
// capsule, placed after it, gives way to it. None inside the area: as any kept label (`keptAt`).
function pickRoom(
  view: LabelView,
  position: LatLng,
  words: Words,
  list: readonly LabelSide[],
  rooms: Rooms,
): { side: LabelSide; words: Words } | null {
  const short = oneLine(words);
  const one = atView(view, position, short, list, rooms.covering);
  if (one !== null) {
    return { side: one, words: short };
  }
  let best: { side: LabelSide; words: Words; cost: number } | null = null;
  for (const form of [words, short]) {
    for (const side of list) {
      const box = boxIn(view, position, { ...form, side });
      const cost = (covered(box, rooms.clear) > 0 ? CLEAR_COST : 0) + covered(box, rooms.rounds);
      if (inside(box, view.area) && (best === null || cost < best.cost)) {
        best = { side, words: form, cost };
      }
    }
  }
  return best === null ? null : { side: best.side, words: best.words };
}

// More than any count of rounds: a pick's label keeps clear of a person's mark, a label, a face, or a line before it
// keeps clear of rounds.
const CLEAR_COST = 1000;

// What a label at a view keeps clear of: everything (`covering`); the labels, faces, the User's own mark, and the lines
// (`clear`); the labels and the lines (`labels`); the other points' symbols (`rounds`); and the sides its point's other
// labels took (`taken`). `pinned`: some mark's symbol is a person's.
export interface Rooms {
  covering: readonly ViewArea[];
  rounds: readonly ViewArea[];
  clear: readonly ViewArea[];
  labels: readonly ViewArea[];
  taken: ReadonlySet<LabelSide>;
  pinned: boolean;
}

// The boxes of the points' symbols that `which` takes, by point; null for the others.
export function symbolBoxes(
  view: LabelView,
  points: readonly MarkPoint[],
  which: (point: MarkPoint) => boolean,
): (ViewArea | null)[] {
  return points.map((point) => {
    const { symbol } = point;
    return symbol === null || !which(point) ? null : symbolBox(view, symbol);
  });
}

// The side and the words of a label at a view: the first side clear of everything; else none, unless it is never left
// out (`kept`): a tag that gives way (`shrinks`) as `shrunk` says, any other clear of the people's marks where some are
// there, then as `keptAt` says.
export function sideAtView(
  view: LabelView,
  position: LatLng,
  words: Words,
  list: readonly LabelSide[],
  rooms: Rooms,
  { kept, shrinks, roundsFirst = false }: { kept: boolean; shrinks: boolean; roundsFirst?: boolean },
): { side: LabelSide; words: Words } | null {
  const side = atView(view, position, words, list, rooms.covering);
  if (side !== null) {
    return { side, words };
  }
  if (!kept) {
    return null;
  }
  // A tag with no number, as a receded candidate's, keeps its words: shrunk, it would say nothing.
  if (shrinks && words.number !== null) {
    return shrunk(view, position, words, list, rooms);
  }
  const room = roundsFirst ? pickRoom(view, position, words, list, rooms) : null;
  if (room !== null) {
    return room;
  }
  const held =
    (rooms.pinned ? atView(view, position, words, list, rooms.clear) : null) ??
    keptAt(view, position, words, list, rooms.taken, rooms.labels);
  return held === null ? null : { side: held, words };
}
