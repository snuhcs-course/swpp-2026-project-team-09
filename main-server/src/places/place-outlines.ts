import { encloses, metresToRing, type Position } from '../common/geometry.js';

export interface Outline {
  id: string;
  ring: Position[];
}

// A polygon of the national map, with what the map writes on it, such as `공과대학38동글로벌공학교육센터`.
export interface LabelledOutline extends Outline {
  label: string | null;
}

// A person's correction: the Place with this number has this outline, of either source, or none.
export interface OutlineLink {
  number: string;
  outline: string | null;
}

interface Place extends Position {
  number: string | null;
}

// The campus map Places some Places just outside the polygon that the national map draws for them.
const REACH_IN_METRES = 10;

// The Place numbers in a label, each whole: `101동` holds no `1`, and `25-1동` no `25`. A letter after the number
// is a wing of the Place: `919-A동` holds `919`.
const NUMBERS_IN_LABEL = /(?<![0-9-])[0-9]+(?:-[0-9]+)?(?=(?:-[A-Z])?동)/gu;

// In square degrees, which compares two outlines of one campus as well as square metres would.
function areaOf(ring: Position[]): number {
  let twice = 0;
  for (let i = 1; i < ring.length; i += 1) {
    twice += ring[i - 1].longitude * ring[i].latitude - ring[i].longitude * ring[i - 1].latitude;
  }
  return Math.abs(twice) / 2;
}

function names(label: string | null, number: string | null): boolean {
  const numbers: string[] = label?.match(NUMBERS_IN_LABEL) ?? [];
  return number !== null && numbers.includes(number);
}

function nearestTo<T extends Outline>(position: Position, outlines: T[]): { outline: T; metres: number } {
  return outlines
    .map((outline) => ({ outline, metres: metresToRing(outline.ring, position) }))
    .reduce((a, b) => (b.metres < a.metres ? b : a));
}

// The outlines of each Place that has any.
// - A Place takes every polygon of the national map whose label names its number.
// - A Place that no label names takes the polygon that holds its position, the larger when two do. Another Place
//   may have that polygon: an annexe stands inside the polygon of its main place.
// - A Place still without one takes the nearest polygon when it is within reach and no Place has it, the
//   nearest Place first. A polygon that a Place has is that Place's: the one beside it is a store or a link
//   between two Places, which the map does not draw.
// - A Place, an entry without a number, has none.
// - A correction then replaces what the rules gave, with one outline of the national map or of `others`, or with none.
export function outlinesOf<T extends Place>(
  entries: T[],
  polygons: LabelledOutline[],
  others: Outline[],
  links: OutlineLink[],
): Map<T, Position[][]> {
  const places = entries.filter(({ number }) => number !== null);
  const found = new Map<T, Outline[]>();
  for (const place of places) {
    const named = polygons.filter(({ label }) => names(label, place.number));
    const holding = polygons.filter(({ ring }) => encloses(ring, place));
    if (named.length > 0) {
      found.set(place, named);
    } else if (holding.length > 0) {
      found.set(place, [holding.reduce((a, b) => (areaOf(b.ring) > areaOf(a.ring) ? b : a))]);
    }
  }
  const taken = new Set([...found.values()].flat());
  const beside = places
    .filter((place) => !found.has(place))
    .map((place) => ({ place, nearest: nearestTo(place, polygons) }))
    .filter(({ nearest }) => nearest.metres <= REACH_IN_METRES)
    .toSorted((a, b) => a.nearest.metres - b.nearest.metres);
  for (const { place, nearest } of beside) {
    if (!taken.has(nearest.outline)) {
      found.set(place, [nearest.outline]);
      taken.add(nearest.outline);
    }
  }
  for (const link of links) {
    const place = places.find(({ number }) => number === link.number);
    const outline = [...polygons, ...others].find(({ id }) => id === link.outline);
    if (place === undefined) {
      throw new Error(`A link names place ${link.number}, which the seed does not hold`);
    }
    if (link.outline === null) {
      found.delete(place);
    } else if (outline === undefined) {
      throw new Error(`A link names the outline ${link.outline}, which the seed does not hold`);
    } else {
      found.set(place, [outline]);
    }
  }
  return new Map([...found].map(([place, outlines]) => [place, outlines.map(({ ring }) => ring)]));
}
