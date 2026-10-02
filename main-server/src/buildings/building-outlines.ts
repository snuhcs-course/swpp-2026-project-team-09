import { encloses, metresToRing, type Position } from '../common/geometry.js';

export interface Outline {
  id: string;
  ring: Position[];
}

// A polygon of the national map, with what the map writes on it, such as `공과대학38동글로벌공학교육센터`.
export interface LabelledOutline extends Outline {
  label: string | null;
}

// A person's correction: the building with this number has this outline, of either source, or none.
export interface OutlineLink {
  number: string;
  outline: string | null;
}

interface Building extends Position {
  number: string | null;
}

// The campus map places some buildings just outside the polygon that the national map draws for them.
const REACH_IN_METRES = 10;

// The building numbers in a label, each whole: `101동` holds no `1`, and `25-1동` no `25`.
const NUMBERS_IN_LABEL = /(?<![0-9-])[0-9]+(?:-[0-9]+)?(?=동)/gu;

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

// The outlines of each building that has any.
// - A building takes every polygon of the national map whose label names its number.
// - A building that no label names takes the polygon that holds its position, the larger when two do. Another building
//   may have that polygon: an annexe stands inside the polygon of its main building.
// - A building still without one takes the nearest polygon when it is within reach and no building has it, the
//   nearest building first. A polygon that a building has is that building's: the one beside it is a store or a link
//   between two buildings, which the map does not draw.
// - A place, an entry without a number, has none.
// - A correction then replaces what the rules gave, with one outline of the national map or of `others`, or with none.
export function outlinesOf<T extends Building>(
  entries: T[],
  polygons: LabelledOutline[],
  others: Outline[],
  links: OutlineLink[],
): Map<T, Position[][]> {
  const buildings = entries.filter(({ number }) => number !== null);
  const found = new Map<T, Outline[]>();
  for (const building of buildings) {
    const named = polygons.filter(({ label }) => names(label, building.number));
    const holding = polygons.filter(({ ring }) => encloses(ring, building));
    if (named.length > 0) {
      found.set(building, named);
    } else if (holding.length > 0) {
      found.set(building, [holding.reduce((a, b) => (areaOf(b.ring) > areaOf(a.ring) ? b : a))]);
    }
  }
  const taken = new Set([...found.values()].flat());
  const beside = buildings
    .filter((building) => !found.has(building))
    .map((building) => ({ building, nearest: nearestTo(building, polygons) }))
    .filter(({ nearest }) => nearest.metres <= REACH_IN_METRES)
    .toSorted((a, b) => a.nearest.metres - b.nearest.metres);
  for (const { building, nearest } of beside) {
    if (!taken.has(nearest.outline)) {
      found.set(building, [nearest.outline]);
      taken.add(nearest.outline);
    }
  }
  for (const link of links) {
    const building = buildings.find(({ number }) => number === link.number);
    const outline = [...polygons, ...others].find(({ id }) => id === link.outline);
    if (building === undefined) {
      throw new Error(`A link names building ${link.number}, which the seed does not hold`);
    }
    if (link.outline === null) {
      found.delete(building);
    } else if (outline === undefined) {
      throw new Error(`A link names the outline ${link.outline}, which the seed does not hold`);
    } else {
      found.set(building, [outline]);
    }
  }
  return new Map([...found].map(([building, outlines]) => [building, outlines.map(({ ring }) => ring)]));
}
