import { z } from 'zod';
import { readSeedFile } from '../common/seed-directory.js';
import { PrismaClient } from '../generated/prisma/client.js';

// The operator's number for the circular route, the one route the seed holds.
export const ROUTE_NUMBER = '41946';

// The campus map's stops of its loop as it serves them, with the coordinates as text.
const campusMapFileSchema = z.object({
  suttle_route_path_list: z.array(
    z.object({
      bus_station_code: z.number(),
      bus_station_name: z.string(),
      bus_station_latitude: z.coerce.number(),
      bus_station_longitude: z.coerce.number(),
    }),
  ),
});

// The route page's service hours, and the operator's stops in loop order, each with its key, its place on the drawing
// and the campus map's stop it is paired with.
export const stopsFileSchema = z.object({
  serviceHours: z.string().min(1),
  stops: z
    .array(
      z.object({
        key: z.int().positive(),
        name: z.string().min(1),
        left: z.int(),
        top: z.int(),
        campusMapStop: z.string(),
      }),
    )
    .refine((stops) => new Set(stops.map(({ key }) => key)).size === stops.length, 'Each key must appear once')
    .refine((stops) => new Set(stops.map(({ name }) => name)).size === stops.length, 'Each stop must appear once'),
});

// GeoJSON's order: longitude, then latitude.
export const routeFileSchema = z.object({
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  }),
});

// Updates each stop in place by its key, whatever else a correction changes, so that it keeps its identifier. A stop
// that has left the seed is removed: nothing that lasts points at a stop.
export async function loadShuttle(prisma: PrismaClient, directory: string): Promise<number> {
  const campusMap = await readSeedFile(directory, 'campus-map-shuttle-stops.json', campusMapFileSchema);
  const { stops, serviceHours } = await readSeedFile(directory, 'shuttle-stops.json', stopsFileSchema);
  const { geometry } = await readSeedFile(directory, 'shuttle-route.geojson', routeFileSchema);
  const entries = stops.map(({ key, name, left, top, campusMapStop }, loopOrder) => {
    const paired = campusMap.suttle_route_path_list.find((stop) => stop.bus_station_name === campusMapStop);
    if (paired === undefined) {
      throw new Error(`${name} is paired with ${campusMapStop}, which the campus map does not list`);
    }
    return {
      seedKey: key,
      name,
      loopOrder,
      latitude: paired.bus_station_latitude,
      longitude: paired.bus_station_longitude,
      drawingLeft: left,
      drawingTop: top,
    };
  });
  const line = geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
  await prisma.$transaction([
    prisma.shuttleStop.deleteMany({ where: { seedKey: { notIn: entries.map((entry) => entry.seedKey) } } }),
    ...entries.map(({ drawingLeft, drawingTop, ...values }) =>
      prisma.shuttleStop.upsert({
        where: { seedKey: values.seedKey },
        create: { ...values, drawingLeft, drawingTop },
        // Once a stop is loaded, its place on the drawing is the one the worker last read from the route page.
        update: values,
      }),
    ),
    prisma.shuttleRoute.upsert({
      where: { number: ROUTE_NUMBER },
      // Once the route is loaded, its service hours are those the worker last read from the route page.
      create: { number: ROUTE_NUMBER, line, serviceHours },
      update: { line },
    }),
  ]);
  return entries.length;
}
