/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';

// `pnpm seed:export openstreetmap-cafes`: every café in the campus's extent, as OpenStreetMap holds it. One without a
// name is left out, as nothing could call it. The server ties each to its Place by position when it starts.

const pointSchema = z.object({ lat: z.number(), lon: z.number() });

// A node has its own point; a way or a relation, the centre Overpass computes.
const answerSchema = z.object({
  osm3s: z.object({ copyright: z.string() }),
  elements: z.array(
    z.object({
      type: z.string(),
      id: z.number(),
      tags: z.object({ name: z.string().optional() }),
      lat: z.number().optional(),
      lon: z.number().optional(),
      center: pointSchema.optional(),
    }),
  ),
});

interface Exporting {
  overpass: (query: string) => Promise<unknown>;
  write: (name: string, value: object) => Promise<void>;
  today: () => string;
  extent: { south: number; west: number; north: number; east: number };
  from: string;
}

export async function exportOpenStreetMapCafes({ overpass, write, today, extent, from }: Exporting): Promise<void> {
  const query = `[out:json][timeout:25][bbox:${Object.values(extent).join(',')}];nwr["amenity"="cafe"];out tags center;`;
  const { osm3s, elements } = answerSchema.parse(await overpass(query));
  const cafes = elements
    .flatMap(({ type, id, tags, lat, lon, center }) => {
      const point = center ?? (lat === undefined || lon === undefined ? null : { lat, lon });
      return tags.name === undefined || point === null
        ? []
        : [{ id: `${type}/${id}`, name: tags.name, latitude: point.lat, longitude: point.lon }];
    })
    .toSorted((one, other) => one.id.localeCompare(other.id));
  await write('openstreetmap-cafes.json', {
    exportedFrom: from,
    query,
    exportedOn: today(),
    copyright: osm3s.copyright,
    cafes,
  });
}
