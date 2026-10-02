import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { CampusBoundary } from '../common/campus-boundary.js';
import { BuildingSource, PrismaClient } from '../generated/prisma/client.js';

// The campus map's rows as it serves them, with the coordinates as text.
const campusMapFile = z.object({
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

const openStreetMapFile = z.object({
  buildings: z.array(
    z.object({ id: z.string(), number: z.string(), name: z.string(), latitude: z.number(), longitude: z.number() }),
  ),
});

// `관악 223동[우석경제관]` is 우석경제관.
const WRAPPED_NAME = /^관악 \S+동\[(.+)\]$/u;

async function read<T>(directory: string, file: string, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(JSON.parse(await readFile(join(directory, file), 'utf8')));
}

// Updates each entry in place by its source's identifier, so that whatever points at a building still does. An entry
// that has left the seed files stays.
export async function loadBuildings(
  prisma: PrismaClient,
  directory: string,
  boundary: CampusBoundary,
): Promise<number> {
  const { rows } = await read(directory, 'campus-map-buildings.json', campusMapFile);
  const { buildings } = await read(directory, 'openstreetmap-buildings.json', openStreetMapFile);
  const entries = [
    ...rows
      // The map's own test row.
      .filter((row) => row.inst_kor_nm !== 'Test')
      .map((row) => ({
        source: BuildingSource.campus_map,
        sourceId: String(row.inst_seq),
        number: row.vil_dong_nm,
        name: WRAPPED_NAME.exec(row.inst_kor_nm)?.[1] ?? row.inst_kor_nm,
        latitude: row.lat_val,
        longitude: row.lon_val,
      })),
    ...buildings.map(({ id, number, name, latitude, longitude }) => ({
      source: BuildingSource.openstreetmap,
      sourceId: id,
      number,
      name,
      latitude,
      longitude,
    })),
  ].filter((entry) => boundary.contains(entry));
  await prisma.$transaction(
    entries.map(({ source, sourceId, ...values }) =>
      prisma.building.upsert({
        where: { source_sourceId: { source, sourceId } },
        create: { source, sourceId, ...values },
        update: values,
      }),
    ),
  );
  return entries.length;
}
