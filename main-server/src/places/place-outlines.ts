/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { encloses, metresToRing, type Position } from '../common/geometry.js';

export interface Outline {
  id: string;
  ring: Position[];
}

// A polygon of the national map, with what the map writes on it, such as `공과대학38동글로벌공학교육센터`.
export interface LabelledOutline extends Outline {
  label: string | null;
}

// What `place-outlines.json` gives one Place, which it names by its number or by its name: these outlines of either
// source, or none.
export type GivenOutlines = ({ number: string } | { name: string }) & { outlines: string[] };

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

function labelNames(label: string | null, number: string | null): boolean {
  const numbers: string[] = label?.match(NUMBERS_IN_LABEL) ?? [];
  return number !== null && numbers.includes(number);
}

// The one Place that an entry of `place-outlines.json` names.
function placeOf<T extends Entry>(given: GivenOutlines, entries: T[]): T {
  const [what, named] =
    'number' in given
      ? [`the number ${given.number}`, entries.filter(({ number }) => number === given.number)]
      : [`the name ${given.name}`, entries.filter(({ name }) => name === given.name)];
  const [place] = named;
  if (place === undefined || named.length > 1) {
    throw new Error(`place-outlines.json has ${what}, which ${named.length} Places of the seed bear`);
  }
  return place;
}

function outlinesNamed(ids: string[], outlines: Outline[]): Outline[] {
  return ids.map((id) => {
    const outline = outlines.find((candidate) => candidate.id === id);
    if (outline === undefined) {
      throw new Error(`place-outlines.json has the outline ${id}, which the seed does not hold`);
    }
    return outline;
  });
}

// The outlines of each Place that has any.
// - A Place takes every polygon of the national map whose label names its number.
// - A Place that no label names takes the polygon that holds its position, the larger when two do. Another Place may
//   have that polygon: an annexe stands inside the polygon of its main building.
// - `place-outlines.json` then gives each Place it names its outlines, of either source, or none, in place of what
//   the two rules gave.
// - A Place still without one, which the file does not name, takes the nearest polygon within reach that no Place
//   has, the nearest Place first. This rule guesses, so it comes last and takes nothing that a Place has.
export function outlinesOf<T extends Entry>(
  entries: T[],
  polygons: LabelledOutline[],
  openStreetMap: Outline[],
  given: GivenOutlines[],
): Map<T, Position[][]> {
  const found = new Map<T, Outline[]>();
  for (const place of entries) {
    const named = polygons.filter(({ label }) => labelNames(label, place.number));
    const holding = polygons.filter(({ ring }) => encloses(ring, place));
    if (named.length > 0) {
      found.set(place, named);
    } else if (holding.length > 0) {
      found.set(place, [holding.reduce((a, b) => (areaOf(b.ring) > areaOf(a.ring) ? b : a))]);
    }
  }
  const settled = new Set<T>();
  for (const entry of given) {
    const place = placeOf(entry, entries);
    const itsOutlines = outlinesNamed(entry.outlines, [...polygons, ...openStreetMap]);
    if (itsOutlines.length > 0) {
      found.set(place, itsOutlines);
    } else {
      found.delete(place);
    }
    settled.add(place);
  }
  const taken = new Set<Outline>([...found.values()].flat());
  const free = polygons.filter((polygon) => !taken.has(polygon));
  const beside = entries
    .filter((place) => !found.has(place) && !settled.has(place))
    .flatMap((place) => free.map((polygon) => ({ place, polygon, metres: metresToRing(polygon.ring, place) })))
    .filter(({ metres }) => metres <= REACH_IN_METRES)
    .toSorted((a, b) => a.metres - b.metres);
  for (const { place, polygon } of beside) {
    if (!found.has(place) && !taken.has(polygon)) {
      found.set(place, [polygon]);
      taken.add(polygon);
    }
  }
  return new Map([...found].map(([place, its]) => [place, its.map(({ ring }) => ring)]));
}
