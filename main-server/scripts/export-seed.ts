import { readFile, writeFile } from 'node:fs/promises';
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { z } from 'zod';
import { nationalMapOutlines } from './national-map.ts';

// Exports the seed files named, such as `pnpm seed:export campus-boundary`. Each export is one request, or reads one
// file that a person downloaded, and its file keeps the address or query it came from and the day of the export.

// The worker server's. OpenStreetMap asks for a User-Agent that names the project.
const USER_AGENT = 'SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
// Node gives each address of a host 250 ms to connect before it tries the next one. Overpass, in Europe, takes about
// a second from Korea, so that every attempt would time out.
setDefaultAutoSelectFamilyAttemptTimeout(5000);
const CAMPUS_MAP_PLACES = 'https://map.snu.ac.kr/api/building.action?page=1&rows=1000';

const BOUNDARY_QUERY = '[out:json][timeout:25];relation(11917142);out geom;';

// The Places the campus map does not list, by their names in OpenStreetMap, which give their numbers.
const MISSING_PLACES = new Map([
  ['체육문화교육연구동(71-1동)', '71-1'],
  ['901', '901'],
]);
// In the order of an Overpass bounding box.
const CAMPUS_EXTENT = { south: 37.4470628, west: 126.9474475, north: 37.4692598, east: 126.9612239 };
const MISSING_PLACES_QUERY =
  `[out:json][timeout:25][bbox:${Object.values(CAMPUS_EXTENT).join(',')}];(` +
  [...MISSING_PLACES.keys()].map((name) => `nwr["building"]["name"="${name}"];`).join('') +
  ');out tags center;';

const pointSchema = z.object({ lat: z.number(), lon: z.number() });
const copyrightSchema = z.object({ copyright: z.string() });

const boundaryAnswerSchema = z.object({
  osm3s: copyrightSchema,
  elements: z.tuple([
    z.object({ members: z.array(z.object({ role: z.string(), geometry: z.array(pointSchema) })).min(1) }),
  ]),
});

const placesAnswerSchema = z.object({
  osm3s: copyrightSchema,
  elements: z.array(
    z.object({ type: z.string(), id: z.number(), tags: z.object({ name: z.string() }), center: pointSchema }),
  ),
});

// `way/193893586`, as `place-outlines.json` names an outline of OpenStreetMap.
const OPENSTREETMAP_OUTLINE = /^(way|relation)\/(\d+)$/u;

const placeOutlinesFileSchema = z.object({ places: z.array(z.object({ outlines: z.array(z.string()) })) });

const outlineTagsSchema = z.object({ name: z.string().optional() });

// 국토지리정보원's 연속수치지형도 건물 layer, which a person downloads from this page of VWorld after logging in.
const NATIONAL_MAP_PAGE = 'https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?dsId=30162';
// 공공누리 type 1, the layer's licence, asks that the source is shown.
const NATIONAL_MAP_ATTRIBUTION =
  'Source: 국토지리정보원 (National Geographic Information Institute), 연속수치지형도 건물, downloaded from VWorld. ' +
  'Used under 공공누리 제1유형 (Korea Open Government License type 1, which asks that the source is shown).';

const outlinesAnswerSchema = z.object({
  osm3s: copyrightSchema,
  elements: z.array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('way'), id: z.number(), tags: outlineTagsSchema, geometry: z.array(pointSchema) }),
      z.object({
        type: z.literal('relation'),
        id: z.number(),
        tags: outlineTagsSchema,
        members: z.array(
          z.object({ type: z.string(), ref: z.number(), role: z.string(), geometry: z.array(pointSchema).optional() }),
        ),
      }),
    ]),
  ),
});

type Coordinates = [longitude: number, latitude: number];

async function request(url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return response;
}

async function overpass(query: string): Promise<unknown> {
  const response = await request(OVERPASS, { method: 'POST', body: new URLSearchParams({ data: query }) });
  return response.json();
}

function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

async function write(name: string, value: object): Promise<void> {
  const file = fileURLToPath(new URL(`../seed/${name}`, import.meta.url));
  const options = await resolveConfig(file);
  await writeFile(file, await format(JSON.stringify(value, null, 2), { ...options, filepath: file }));
  console.log(`Wrote ${file}`);
}

function same(a: Coordinates | undefined, b: Coordinates | undefined): boolean {
  return a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1];
}

// Joins the outer ways end to end into one closed ring.
function ring(ways: Coordinates[][]): Coordinates[] {
  const [joined = [], ...rest] = ways;
  while (rest.length > 0) {
    const end = joined.at(-1);
    const next = rest.findIndex((way) => same(way[0], end) || same(way.at(-1), end));
    if (next === -1) {
      throw new Error('The outer ways do not join end to end');
    }
    const [way = []] = rest.splice(next, 1);
    joined.push(...(same(way[0], end) ? way : way.toReversed()).slice(1));
  }
  if (!same(joined[0], joined.at(-1))) {
    throw new Error('The outer ways do not close');
  }
  return joined;
}

async function exportCampusBoundary(): Promise<void> {
  const { osm3s, elements } = boundaryAnswerSchema.parse(await overpass(BOUNDARY_QUERY));
  const [{ members }] = elements;
  if (members.some(({ role }) => role !== 'outer')) {
    throw new Error('The relation is more than one outer ring');
  }
  const ways = members.map(({ geometry }) => coordinates(geometry));
  await write('campus-boundary.geojson', {
    type: 'Feature',
    properties: { exportedFrom: OVERPASS, query: BOUNDARY_QUERY, exportedOn: today(), copyright: osm3s.copyright },
    geometry: { type: 'Polygon', coordinates: [ring(ways)] },
  });
}

async function exportCampusMapPlaces(): Promise<void> {
  const response = await request(CAMPUS_MAP_PLACES);
  // The map answers in EUC-KR.
  const text = new TextDecoder('euc-kr').decode(await response.arrayBuffer());
  const { rows } = z.object({ rows: z.array(z.looseObject({})) }).parse(JSON.parse(text));
  await write('campus-map-places.json', { exportedFrom: CAMPUS_MAP_PLACES, exportedOn: today(), rows });
}

async function exportOpenStreetMapPlaces(): Promise<void> {
  const { osm3s, elements } = placesAnswerSchema.parse(await overpass(MISSING_PLACES_QUERY));
  const places = elements.map(({ type, id, tags, center }) => ({
    id: `${type}/${id}`,
    number: MISSING_PLACES.get(tags.name),
    name: tags.name,
    // The centre of the element's bounding box, as Overpass computes it.
    latitude: center.lat,
    longitude: center.lon,
  }));
  if (places.length !== MISSING_PLACES.size || new Set(places.map(({ name }) => name)).size !== places.length) {
    throw new Error(`Expected one element of each of: ${[...MISSING_PLACES.keys()].join(', ')}`);
  }
  await write('openstreetmap-places.json', {
    exportedFrom: OVERPASS,
    query: MISSING_PLACES_QUERY,
    exportedOn: today(),
    copyright: osm3s.copyright,
    places,
  });
}

function coordinates(geometry: z.infer<typeof pointSchema>[]): Coordinates[] {
  return geometry.map(({ lat, lon }): Coordinates => [lon, lat]);
}

// Each outline as one ring. A relation's outer way that is a ring by itself, a part standing apart, is an outline of
// its own under the way's identifier; its other outer ways are joined into one ring. A courtyard, an inner way, is
// left out, so that a position in it is in the Place.
function outlinesOf(
  element: z.infer<typeof outlinesAnswerSchema>['elements'][number],
): { id: string; outline: Coordinates[] }[] {
  if (element.type === 'way') {
    return [{ id: `way/${element.id}`, outline: coordinates(element.geometry) }];
  }
  const outer = element.members
    .filter(({ role }) => role === 'outer')
    .map(({ type, ref, geometry = [] }) => ({ id: `${type}/${ref}`, outline: coordinates(geometry) }));
  const apart = outer.filter(({ outline }) => same(outline[0], outline.at(-1)));
  const open = outer.filter(({ outline }) => !same(outline[0], outline.at(-1)));
  return open.length === 0
    ? apart
    : apart.concat({ id: `relation/${element.id}`, outline: ring(open.map(({ outline }) => outline)) });
}

// The outlines of OpenStreetMap that `place-outlines.json` names. Every other outline is the national map's.
async function exportOpenStreetMapOutlines(): Promise<void> {
  const file = fileURLToPath(new URL('../seed/place-outlines.json', import.meta.url));
  const { places } = placeOutlinesFileSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  const named = places.flatMap(({ outlines }) => outlines.filter((id) => OPENSTREETMAP_OUTLINE.test(id)));
  const elementsNamed = named.map((id) => id.replace(OPENSTREETMAP_OUTLINE, '$1(id:$2);')).join('');
  const query = `[out:json][timeout:25];(${elementsNamed});out geom;`;
  const { osm3s, elements } = outlinesAnswerSchema.parse(await overpass(query));
  const features = elements
    .flatMap((element) =>
      outlinesOf(element).map(({ id, outline }) => ({
        type: 'Feature',
        id,
        properties: { name: element.tags.name ?? null },
        geometry: { type: 'Polygon', coordinates: [outline] },
      })),
    )
    .filter(({ id }) => named.includes(id));
  const missing = named.filter((id) => !features.some((feature) => feature.id === id));
  if (missing.length > 0) {
    throw new Error(`OpenStreetMap answered no outline ${missing.join(', ')}`);
  }
  await write('openstreetmap-outlines.geojson', {
    type: 'FeatureCollection',
    exportedFrom: OVERPASS,
    query,
    exportedOn: today(),
    copyright: osm3s.copyright,
    features,
  });
}

async function exportNationalMapOutlines(path: string): Promise<void> {
  await write('national-map-outlines.geojson', {
    type: 'FeatureCollection',
    exportedFrom: NATIONAL_MAP_PAGE,
    file: basename(path),
    exportedOn: today(),
    attribution: NATIONAL_MAP_ATTRIBUTION,
    features: await nationalMapOutlines(path, CAMPUS_EXTENT),
  });
}

const EXPORTS: Record<string, () => Promise<void>> = {
  'campus-boundary': exportCampusBoundary,
  'campus-map-places': exportCampusMapPlaces,
  'openstreetmap-places': exportOpenStreetMapPlaces,
  'openstreetmap-outlines': exportOpenStreetMapOutlines,
};

// The exports that read a file a person downloaded, whose path follows the name.
const FILE_EXPORTS: Record<string, (path: string) => Promise<void>> = {
  'national-map-outlines': exportNationalMapOutlines,
};

// The exports that the arguments name, or null when an argument names none or a path is missing.
function exportsNamed(args: string[]): (() => Promise<void>)[] | null {
  const named: (() => Promise<void>)[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const name = args[i] ?? '';
    const fromRequest = EXPORTS[name];
    const fromFile = FILE_EXPORTS[name];
    if (fromRequest !== undefined) {
      named.push(fromRequest);
    } else if (fromFile !== undefined && i + 1 < args.length) {
      i += 1;
      const path = args[i] ?? '';
      named.push(() => fromFile(path));
    } else {
      return null;
    }
  }
  return named;
}

const named = exportsNamed(process.argv.slice(2));
if (named === null || named.length === 0) {
  const fromFile = Object.keys(FILE_EXPORTS).map((name) => `${name} <path of the downloaded file>`);
  console.error(`Name one or more of: ${[...Object.keys(EXPORTS), ...fromFile].join(', ')}`);
  process.exitCode = 1;
} else {
  for (const run of named) {
    // oxlint-disable-next-line no-await-in-loop -- one export at a time
    await run();
  }
}
