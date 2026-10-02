import { v5 as uuidv5 } from 'uuid';
import { z } from 'zod';
import { CampusBoundary } from '../common/campus-boundary.js';
import { readSeedFile } from '../common/seed-directory.js';
import { BuildingOrigin, Prisma, PrismaClient } from '../generated/prisma/client.js';
import { type Outline, outlinesOf } from './building-outlines.js';

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
  buildings: z.array(
    z.object({ id: z.string(), number: z.string(), name: z.string(), latitude: z.number(), longitude: z.number() }),
  ),
});

// OpenStreetMap's building outlines, each one ring in GeoJSON's order of longitude and latitude.
const outlinesFileSchema = z.object({
  features: z.array(
    z.object({
      id: z.string(),
      geometry: z.object({
        type: z.literal('Polygon'),
        coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()])).min(4)]),
      }),
    }),
  ),
});

// A person's corrections of which outline a building has, each with its reason.
const linksFileSchema = z.object({
  links: z.array(z.object({ number: z.string().min(1), outline: z.string().nullable(), why: z.string().min(1) })),
});

// `관악 223동[우석경제관]` is 우석경제관.
const WRAPPED_NAME = /^관악 \S+동\[(.+)\]$/u;

// A building's id is a UUID v5 of `campus_map:188` under this namespace, so that it is the same in every database
// and after the buildings are loaded anew. Changing the namespace or that name changes every building's id.
const ID_NAMESPACE = 'f0a41c01-89fc-436e-89a8-4fed1b7da405';

function idOf(origin: BuildingOrigin, originId: string): string {
  return uuidv5(`${origin}:${originId}`, ID_NAMESPACE);
}

async function readOutlines(directory: string): Promise<Outline[]> {
  const { features } = await readSeedFile(directory, 'openstreetmap-building-outlines.geojson', outlinesFileSchema);
  return features.map(({ id, geometry }) => ({
    id,
    ring: geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude })),
  }));
}

// Updates each entry in place by its id, so that whatever points at a building still does. An entry that has left the
// seed files stays.
export async function loadBuildings(
  prisma: PrismaClient,
  directory: string,
  boundary: CampusBoundary,
): Promise<number> {
  const { rows } = await readSeedFile(directory, 'campus-map-buildings.json', campusMapFileSchema);
  const { buildings } = await readSeedFile(directory, 'openstreetmap-buildings.json', openStreetMapFileSchema);
  const entries = [
    ...rows
      // The map's own test row.
      .filter((row) => row.inst_kor_nm !== 'Test')
      .map((row) => ({
        origin: BuildingOrigin.campus_map,
        originId: String(row.inst_seq),
        number: row.vil_dong_nm,
        name: WRAPPED_NAME.exec(row.inst_kor_nm)?.[1] ?? row.inst_kor_nm,
        latitude: row.lat_val,
        longitude: row.lon_val,
      })),
    ...buildings.map(({ id, number, name, latitude, longitude }) => ({
      origin: BuildingOrigin.openstreetmap,
      originId: id,
      number,
      name,
      latitude,
      longitude,
    })),
  ].filter((entry) => boundary.contains(entry));
  const { links } = await readSeedFile(directory, 'building-outline-links.json', linksFileSchema);
  const outlines = outlinesOf(entries, await readOutlines(directory), links);
  await prisma.$transaction(
    entries.map((entry) => {
      const { origin, originId, ...values } = entry;
      const id = idOf(origin, originId);
      // A building that lost its outline is stored without one.
      const outline = outlines.get(entry) ?? Prisma.DbNull;
      return prisma.building.upsert({
        where: { id },
        create: { id, origin, originId, ...values, outline },
        update: { ...values, outline },
      });
    }),
  );
  return entries.length;
}
