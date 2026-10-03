import { encloses, metresToRing, type Position } from '../common/geometry.js';

export interface Outline {
  id: string;
  ring: Position[];
}

// A polygon of the national map, with what the map writes on it, such as `공과대학38동글로벌공학교육센터`.
export interface LabelledOutline extends Outline {
  label: string | null;
}

// What `place-outlines.json` gives one Place: these outlines of either source, or none. It names the Place by its
// number or, when it has none, by its name.
export interface GivenOutlines {
  number?: string;
  name?: string;
  outlines: string[];
}

interface Entry extends Position {
  number: string | null;
  name: string;
}

// The campus map sets some Places just outside the polygon that the national map draws for them.
const REACH_IN_METRES = 10;

// The numbers in a label, each whole: `101동` holds no `1`, and `25-1동` no `25`. A letter after the number is a wing:
// `919-A동` holds `919`.
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

// The one Place that an entry of `place-outlines.json` names.
function placeOf<T extends Entry>(given: GivenOutlines, entries: T[]): T {
  const named = entries.filter(({ number, name }) =>
    given.number === undefined ? name === given.name : number === given.number,
  );
  const [place] = named;
  if (place === undefined || named.length > 1) {
    const what = given.number === undefined ? `the name ${given.name}` : `the number ${given.number}`;
    throw new Error(`place-outlines.json has ${what}, which ${named.length} Places of the seed bear`);
  }
  return place;
}

// The outlines of each Place that has any.
// - A Place takes every polygon of the national map whose label names its number.
// - A Place that no label names takes the polygon that holds its position, the larger when two do. Another Place may
//   have that polygon: an annexe stands inside the polygon of its main building.
// - A Place still without one takes the nearest polygon within reach that no Place has, the nearest Place first. A
//   polygon that a Place has by the rules above stays that Place's alone.
// - `place-outlines.json` then replaces what the rules gave a Place, with outlines of the national map or of `others`,
//   or with none.
export function outlinesOf<T extends Entry>(
  entries: T[],
  polygons: LabelledOutline[],
  others: Outline[],
  given: GivenOutlines[],
): Map<T, Position[][]> {
  const found = new Map<T, Outline[]>();
  for (const place of entries) {
    const named = polygons.filter(({ label }) => names(label, place.number));
    const holding = polygons.filter(({ ring }) => encloses(ring, place));
    if (named.length > 0) {
      found.set(place, named);
    } else if (holding.length > 0) {
      found.set(place, [holding.reduce((a, b) => (areaOf(b.ring) > areaOf(a.ring) ? b : a))]);
    }
  }
  const taken = new Set<Outline>([...found.values()].flat());
  const free = polygons.filter((polygon) => !taken.has(polygon));
  const beside = entries
    .filter((place) => !found.has(place))
    .flatMap((place) => free.map((polygon) => ({ place, polygon, metres: metresToRing(polygon.ring, place) })))
    .filter(({ metres }) => metres <= REACH_IN_METRES)
    .toSorted((a, b) => a.metres - b.metres);
  for (const { place, polygon } of beside) {
    if (!found.has(place) && !taken.has(polygon)) {
      found.set(place, [polygon]);
      taken.add(polygon);
    }
  }
  const outlines = [...polygons, ...others];
  for (const entry of given) {
    const place = placeOf(entry, entries);
    const itsOutlines = entry.outlines.map((id) => {
      const outline = outlines.find((candidate) => candidate.id === id);
      if (outline === undefined) {
        throw new Error(`place-outlines.json has the outline ${id}, which the seed does not hold`);
      }
      return outline;
    });
    if (itsOutlines.length > 0) {
      found.set(place, itsOutlines);
    } else {
      found.delete(place);
    }
  }
  return new Map([...found].map(([place, its]) => [place, its.map(({ ring }) => ring)]));
}
