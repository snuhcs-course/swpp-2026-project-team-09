import { z } from 'zod';
import { readSeedFile } from '../common/seed-directory.js';
import { PrismaClient } from '../generated/prisma/client.js';

// The operator's number for the circular route, the one route the seed holds.
export const ROUTE_NUMBER = '41946';

// The campus map's stops of its loop as it serves them, with the coordinates as text.
const campusMapFile = z.object({
  suttle_route_path_list: z.array(
    z.object({
      bus_station_code: z.number(),
      bus_station_name: z.string(),
      bus_station_latitude: z.coerce.number(),
      bus_station_longitude: z.coerce.number(),
    }),
  ),
});

// The operator's stops in loop order, each with its place on the drawing and the campus map's stop it is paired with.
const stopsFile = z.object({
  stops: z
    .array(z.object({ name: z.string().min(1), left: z.int(), top: z.int(), campusMapStop: z.string() }))
    .refine((stops) => new Set(stops.map(({ name }) => name)).size === stops.length, 'Each stop must appear once')
    .refine(
      (stops) => new Set(stops.map(({ campusMapStop }) => campusMapStop)).size === stops.length,
      'Each campus map stop must be paired once',
    ),
});

// GeoJSON's order: longitude, then latitude.
const routeFile = z.object({
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  }),
});

// Updates each stop in place by the code of its campus map stop. A stop that has left the seed is removed, with any
// vehicle placed at it: nothing that lasts points at a stop.
export async function loadShuttle(prisma: PrismaClient, directory: string): Promise<number> {
  const campusMap = await readSeedFile(directory, 'campus-map-shuttle-stops.json', campusMapFile);
  const { stops } = await readSeedFile(directory, 'shuttle-stops.json', stopsFile);
  const { geometry } = await readSeedFile(directory, 'shuttle-route.geojson', routeFile);
  const entries = stops.map(({ name, left, top, campusMapStop }, position) => {
    const paired = campusMap.suttle_route_path_list.find((stop) => stop.bus_station_name === campusMapStop);
    if (paired === undefined) {
      throw new Error(`${name} is paired with ${campusMapStop}, which the campus map does not list`);
    }
    return {
      campusMapCode: paired.bus_station_code,
      name,
      position,
      latitude: paired.bus_station_latitude,
      longitude: paired.bus_station_longitude,
      drawingLeft: left,
      drawingTop: top,
    };
  });
  const line = geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
  await prisma.$transaction([
    prisma.shuttleStop.deleteMany({ where: { campusMapCode: { notIn: entries.map((entry) => entry.campusMapCode) } } }),
    ...entries.map(({ drawingLeft, drawingTop, ...values }) =>
      prisma.shuttleStop.upsert({
        where: { campusMapCode: values.campusMapCode },
        create: { ...values, drawingLeft, drawingTop },
        // Once a stop is loaded, its place on the drawing is the one the worker last read from the route page.
        update: values,
      }),
    ),
    prisma.shuttleRoute.upsert({
      where: { number: ROUTE_NUMBER },
      create: { number: ROUTE_NUMBER, line },
      update: { line },
    }),
  ]);
  return entries.length;
}
