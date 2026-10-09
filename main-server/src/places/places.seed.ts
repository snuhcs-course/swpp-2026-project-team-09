// AI-generated with Claude Opus 5.5, 2026-10-03, prompted by fyoon46, reviewed by TaeHyun79 in #32
import { v5 as uuidv5 } from 'uuid';
import { z } from 'zod';
import { CampusBoundary } from '../common/campus-boundary.js';
import { type Position } from '../common/geometry.js';
import { readSeedFile } from '../common/seed-directory.js';
import { PlaceOrigin, PrismaClient } from '../generated/prisma/client.js';
import { type LabelledOutline, type Outline, outlinesOf } from './place-outlines.js';

// The campus map's rows as it serves them, with the coordinates as text.
const campusMapFileSchema = z.object({
  rows: z.array(
    z.object({
      inst_seq: z.number(),
      inst_kor_nm: z.string(),
      vil_dong_nm: z.string().nullable(),
      lat_val: z.coerce.number(),
      lon_val: z.coerce.number(),
    }),
  ),
});

const openStreetMapFileSchema = z.object({
  places: z.array(
    z.object({ id: z.string(), number: z.string(), name: z.string(), latitude: z.number(), longitude: z.number() }),
  ),
});

// The Places that the campus map does not list, each by its polygon of the national map and with its reason.
const nationalMapPlacesFileSchema = z.object({
  places: z.array(
    z.object({
      outline: z.string(),
      number: z.string().min(1).nullable(),
      name: z.string().min(1),
      why: z.string().min(1),
    }),
  ),
});

// One ring in GeoJSON's order of longitude and latitude.
const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()])).min(4)]),
});

// The national map's polygons of the campus, each with its label.
const nationalMapFileSchema = z.object({
  features: z.array(
    z.object({ id: z.string(), properties: z.object({ label: z.string().nullable() }), geometry: polygonSchema }),
  ),
});

// The outlines of OpenStreetMap that `place-outlines.json` names.
const openStreetMapOutlinesFileSchema = z.object({
  features: z.array(z.object({ id: z.string(), geometry: polygonSchema })),
});

// The outlines that a person gives a Place, each entry with its reason and with the Place's number or its name.
const placeOutlinesFileSchema = z.object({
  places: z.array(
    z.union([
      z.strictObject({ number: z.string().min(1), outlines: z.array(z.string()), why: z.string().min(1) }),
      z.strictObject({ name: z.string().min(1), outlines: z.array(z.string()), why: z.string().min(1) }),
    ]),
  ),
});

// `관악 223동[우석경제관]` is 우석경제관.
const WRAPPED_NAME = /^관악 \S+동\[(.+)\]$/u;

// A Place's id is a UUID v5 of `campus_map:188` under this namespace, so that it is the same in every database
// and after the Places are loaded anew. Changing the namespace or that name changes every Place's id.
const ID_NAMESPACE = 'f0a41c01-89fc-436e-89a8-4fed1b7da405';

function idOf(origin: PlaceOrigin, originId: string): string {
  return uuidv5(`${origin}:${originId}`, ID_NAMESPACE);
}

function ringOf({ coordinates }: z.infer<typeof polygonSchema>): Position[] {
  return coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude }));
}

// The middle of the ring's bounding box, which is also what Overpass gives as the position of a Place of OpenStreetMap.
function middleOf(ring: Position[]): Position {
  const latitudes = ring.map(({ latitude }) => latitude);
  const longitudes = ring.map(({ longitude }) => longitude);
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
}

async function readOutlines(directory: string): Promise<{ nationalMap: LabelledOutline[]; openStreetMap: Outline[] }> {
  const nationalMap = await readSeedFile(directory, 'national-map-outlines.geojson', nationalMapFileSchema);
  const openStreetMap = await readSeedFile(
    directory,
    'openstreetmap-outlines.geojson',
    openStreetMapOutlinesFileSchema,
  );
  return {
    nationalMap: nationalMap.features.map(({ id, properties, geometry }) => ({
      id,
      label: properties.label,
      ring: ringOf(geometry),
    })),
    openStreetMap: openStreetMap.features.map(({ id, geometry }) => ({ id, ring: ringOf(geometry) })),
  };
}

interface SeedPlace extends Position {
  origin: PlaceOrigin;
  originId: string;
  number: string | null;
  name: string;
}

// The Places of every origin. One from the national map stands at the middle of its polygon.
async function readPlaces(directory: string, nationalMap: LabelledOutline[]): Promise<SeedPlace[]> {
  const { rows } = await readSeedFile(directory, 'campus-map-places.json', campusMapFileSchema);
  const openStreetMapPlaces = await readSeedFile(directory, 'openstreetmap-places.json', openStreetMapFileSchema);
  const nationalMapPlaces = await readSeedFile(directory, 'national-map-places.json', nationalMapPlacesFileSchema);
  return [
    ...rows
      // The map's own test row.
      .filter((row) => row.inst_kor_nm !== 'Test')
      .map((row) => ({
        origin: PlaceOrigin.campus_map,
        originId: String(row.inst_seq),
        number: row.vil_dong_nm,
        name: WRAPPED_NAME.exec(row.inst_kor_nm)?.[1] ?? row.inst_kor_nm,
        latitude: row.lat_val,
        longitude: row.lon_val,
      })),
    ...openStreetMapPlaces.places.map(({ id, number, name, latitude, longitude }) => ({
      origin: PlaceOrigin.openstreetmap,
      originId: id,
      number,
      name,
      latitude,
      longitude,
    })),
    ...nationalMapPlaces.places.map(({ outline, number, name }) => {
      const polygon = nationalMap.find(({ id }) => id === outline);
      if (polygon === undefined) {
        throw new Error(`national-map-places.json has the polygon ${outline}, which the seed does not hold`);
      }
      const { latitude, longitude } = middleOf(polygon.ring);
      return { origin: PlaceOrigin.national_map, originId: outline, number, name, latitude, longitude };
    }),
  ];
}

// Updates each entry in place by its id, so that whatever points at a Place still does. An entry that has left the
// seed files stays.
export async function loadPlaces(prisma: PrismaClient, directory: string, boundary: CampusBoundary): Promise<number> {
  const { nationalMap, openStreetMap } = await readOutlines(directory);
  const entries = (await readPlaces(directory, nationalMap)).filter((entry) => boundary.contains(entry));
  const given = await readSeedFile(directory, 'place-outlines.json', placeOutlinesFileSchema);
  const found = outlinesOf(entries, nationalMap, openStreetMap, given.places);
  await prisma.$transaction(
    entries.map((entry) => {
      const { origin, originId, ...values } = entry;
      const id = idOf(origin, originId);
      const outlines = found.get(entry) ?? [];
      return prisma.place.upsert({
        where: { id },
        create: { id, origin, originId, ...values, outlines },
        update: { ...values, outlines },
      });
    }),
  );
  return entries.length;
}
