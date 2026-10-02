import { z } from 'zod';
import { CampusBoundary } from '../common/campus-boundary.js';
import { readSeedFile } from '../common/seed-directory.js';
import { BuildingOrigin, PrismaClient } from '../generated/prisma/client.js';

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

// `관악 223동[우석경제관]` is 우석경제관.
const WRAPPED_NAME = /^관악 \S+동\[(.+)\]$/u;

// Updates each entry in place by its origin's identifier, so that whatever points at a building still does. An entry
// that has left the seed files stays.
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
  await prisma.$transaction(
    entries.map(({ origin, originId, ...values }) =>
      prisma.building.upsert({
        where: { origin_originId: { origin, originId } },
        create: { origin, originId, ...values },
        update: values,
      }),
    ),
  );
  return entries.length;
}
