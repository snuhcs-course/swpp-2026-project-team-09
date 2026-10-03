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

// One ring in GeoJSON's order of longitude and latitude.
const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()])).min(4)]),
});

// The national map's polygons of the campus's Places, each with its label.
const nationalMapFileSchema = z.object({
  features: z.array(
    z.object({ id: z.string(), properties: z.object({ label: z.string().nullable() }), geometry: polygonSchema }),
  ),
});

// The outlines of OpenStreetMap that the corrections name.
const openStreetMapOutlinesFileSchema = z.object({
  features: z.array(z.object({ id: z.string(), geometry: polygonSchema })),
});

// A person's corrections of which outline a Place has, each with its reason.
const linksFileSchema = z.object({
  links: z.array(z.object({ number: z.string().min(1), outline: z.string().nullable(), why: z.string().min(1) })),
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

// Updates each entry in place by its id, so that whatever points at a Place still does. An entry that has left the
// seed files stays.
export async function loadPlaces(prisma: PrismaClient, directory: string, boundary: CampusBoundary): Promise<number> {
  const { rows } = await readSeedFile(directory, 'campus-map-places.json', campusMapFileSchema);
  const { places } = await readSeedFile(directory, 'openstreetmap-places.json', openStreetMapFileSchema);
  const entries = [
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
    ...places.map(({ id, number, name, latitude, longitude }) => ({
      origin: PlaceOrigin.openstreetmap,
      originId: id,
      number,
      name,
      latitude,
      longitude,
    })),
  ].filter((entry) => boundary.contains(entry));
  const { links } = await readSeedFile(directory, 'place-outlines.json', linksFileSchema);
  const { nationalMap, openStreetMap } = await readOutlines(directory);
  const found = outlinesOf(entries, nationalMap, openStreetMap, links);
  await prisma.$transaction(
    entries.map((entry) => {
      const { origin, originId, ...values } = entry;
      const id = idOf(origin, originId);
      // A Place that lost its outlines is stored without any.
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
