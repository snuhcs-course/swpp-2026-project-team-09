import { encloses, metresToRing, type Position } from '../common/geometry.js';

export interface Outline {
  id: string;
  ring: Position[];
}

// A person's correction: the building with this number has this outline, or none.
export interface OutlineLink {
  number: string;
  outline: string | null;
}

interface Building extends Position {
  number: string | null;
}

// The campus map places some buildings just outside the outline that OpenStreetMap draws for them.
const REACH_IN_METRES = 10;

// In square degrees, which compares two outlines of one campus as well as square metres would.
function areaOf(ring: Position[]): number {
  let twice = 0;
  for (let i = 1; i < ring.length; i += 1) {
    twice += ring[i - 1].longitude * ring[i].latitude - ring[i].longitude * ring[i - 1].latitude;
  }
  return Math.abs(twice) / 2;
}

function nearestTo(position: Position, outlines: Outline[]): { outline: Outline; metres: number } {
  return outlines
    .map((outline) => ({ outline, metres: metresToRing(outline.ring, position) }))
    .reduce((a, b) => (b.metres < a.metres ? b : a));
}

// The outline of each building that has one.
// - A building takes the outline that holds its position, the larger when two do.
// - A building just outside an outline that holds no building takes that outline, the nearest building first. An
//   outline that holds another building is that building's: the one beside it is a store or a link between two
//   buildings, which OpenStreetMap does not draw.
// - A place, an entry without a number, has none.
// - A link then replaces what the positions gave.
export function outlinesOf<T extends Building>(
  entries: T[],
  outlines: Outline[],
  links: OutlineLink[],
): Map<T, Position[]> {
  const buildings = entries.filter(({ number }) => number !== null);
  const found = new Map<T, Outline>();
  for (const building of buildings) {
    const holding = outlines.filter(({ ring }) => encloses(ring, building));
    if (holding.length > 0) {
      found.set(
        building,
        holding.reduce((a, b) => (areaOf(b.ring) > areaOf(a.ring) ? b : a)),
      );
    }
  }
  const taken = new Set(outlines.filter(({ ring }) => buildings.some((building) => encloses(ring, building))));
  const beside = buildings
    .filter((building) => !found.has(building))
    .map((building) => ({ building, nearest: nearestTo(building, outlines) }))
    .filter(({ nearest }) => nearest.metres <= REACH_IN_METRES)
    .toSorted((a, b) => a.nearest.metres - b.nearest.metres);
  for (const { building, nearest } of beside) {
    if (!taken.has(nearest.outline)) {
      found.set(building, nearest.outline);
      taken.add(nearest.outline);
    }
  }
  for (const link of links) {
    const building = buildings.find(({ number }) => number === link.number);
    const outline = outlines.find(({ id }) => id === link.outline);
    if (building === undefined) {
      throw new Error(`A link names building ${link.number}, which the seed does not hold`);
    }
    if (link.outline === null) {
      found.delete(building);
    } else if (outline === undefined) {
      throw new Error(`A link names the outline ${link.outline}, which the seed does not hold`);
    } else {
      found.set(building, outline);
    }
  }
  return new Map([...found].map(([building, { ring }]) => [building, ring]));
}
