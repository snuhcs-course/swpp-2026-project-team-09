import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { z } from 'zod';

// Exports the seed files named, such as `pnpm seed:export campus-boundary`. Each export is one request, and its file
// keeps the address or query it came from and the day of the export.

// The worker server's. OpenStreetMap asks for a User-Agent that names the project.
const USER_AGENT = 'SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const CAMPUS_MAP_BUILDINGS = 'https://map.snu.ac.kr/api/building.action?page=1&rows=1000';

const BOUNDARY_QUERY = '[out:json][timeout:25];relation(11917142);out geom;';

// The buildings the campus map does not list, by their names in OpenStreetMap, which give their numbers.
const MISSING_BUILDINGS = new Map([
  ['체육문화교육연구동(71-1동)', '71-1'],
  ['901', '901'],
]);
// Within the campus extent.
const MISSING_BUILDINGS_QUERY =
  '[out:json][timeout:25][bbox:37.4470628,126.9474475,37.4692598,126.9612239];(' +
  [...MISSING_BUILDINGS.keys()].map((name) => `nwr["building"]["name"="${name}"];`).join('') +
  ');out tags center;';

const point = z.object({ lat: z.number(), lon: z.number() });
const copyright = z.object({ copyright: z.string() });

const boundaryAnswer = z.object({
  osm3s: copyright,
  elements: z.tuple([z.object({ members: z.array(z.object({ role: z.string(), geometry: z.array(point) })).min(1) })]),
});

const buildingsAnswer = z.object({
  osm3s: copyright,
  elements: z.array(
    z.object({ type: z.string(), id: z.number(), tags: z.object({ name: z.string() }), center: point }),
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
  const { osm3s, elements } = boundaryAnswer.parse(await overpass(BOUNDARY_QUERY));
  const [{ members }] = elements;
  if (members.some(({ role }) => role !== 'outer')) {
    throw new Error('The relation is more than one outer ring');
  }
  const ways = members.map(({ geometry }) => geometry.map(({ lat, lon }): Coordinates => [lon, lat]));
  await write('campus-boundary.geojson', {
    type: 'Feature',
    properties: { exportedFrom: OVERPASS, query: BOUNDARY_QUERY, exportedOn: today(), copyright: osm3s.copyright },
    geometry: { type: 'Polygon', coordinates: [ring(ways)] },
  });
}

async function exportCampusMapBuildings(): Promise<void> {
  const response = await request(CAMPUS_MAP_BUILDINGS);
  // The map answers in EUC-KR.
  const text = new TextDecoder('euc-kr').decode(await response.arrayBuffer());
  const { rows } = z.object({ rows: z.array(z.looseObject({})) }).parse(JSON.parse(text));
  await write('campus-map-buildings.json', { exportedFrom: CAMPUS_MAP_BUILDINGS, exportedOn: today(), rows });
}

async function exportOpenStreetMapBuildings(): Promise<void> {
  const { osm3s, elements } = buildingsAnswer.parse(await overpass(MISSING_BUILDINGS_QUERY));
  const buildings = elements.map(({ type, id, tags, center }) => ({
    id: `${type}/${id}`,
    number: MISSING_BUILDINGS.get(tags.name),
    name: tags.name,
    // The centre of the element's bounding box, as Overpass computes it.
    latitude: center.lat,
    longitude: center.lon,
  }));
  if (
    buildings.length !== MISSING_BUILDINGS.size ||
    new Set(buildings.map(({ name }) => name)).size !== buildings.length
  ) {
    throw new Error(`Expected one element of each of: ${[...MISSING_BUILDINGS.keys()].join(', ')}`);
  }
  await write('openstreetmap-buildings.json', {
    exportedFrom: OVERPASS,
    query: MISSING_BUILDINGS_QUERY,
    exportedOn: today(),
    copyright: osm3s.copyright,
    buildings,
  });
}

const EXPORTS: Record<string, () => Promise<void>> = {
  'campus-boundary': exportCampusBoundary,
  'campus-map-buildings': exportCampusMapBuildings,
  'openstreetmap-buildings': exportOpenStreetMapBuildings,
};

const names = process.argv.slice(2);
if (names.length === 0 || names.some((name) => !(name in EXPORTS))) {
  console.error(`Name one or more of: ${Object.keys(EXPORTS).join(', ')}`);
  process.exitCode = 1;
} else {
  for (const name of names) {
    // oxlint-disable-next-line no-await-in-loop -- one request at a time
    await EXPORTS[name]?.();
  }
}
