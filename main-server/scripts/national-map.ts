import { basename } from 'node:path';
import proj4 from 'proj4';
import shapefile, { type Openable } from 'shapefile';
import yauzl, { type Entry } from 'yauzl';
import { z } from 'zod';

// Reads 국토지리정보원's 연속수치지형도 건물 layer for `pnpm seed:export national-map-building-outlines`.

// The layer's name in each of its files, such as N3A_B0010000_001.shp.
const LAYER = /^N3A_B0010000_\d+\.shp$/u;
// What the layer classes as a building. The campus's other polygons are wall-less structures, temporary buildings and
// greenhouses.
const BUILDING = 'BDK004';
// The layer's coordinates are in EPSG:5179.
const FROM_EPSG_5179 = proj4(
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs',
  'WGS84',
);

const attributesSchema = z.object({ UFID: z.string(), KIND: z.string(), ANNO: z.string().nullable() });

const ringSchema = z.array(z.tuple([z.number(), z.number()])).min(4);
const polygonSchema = z.object({ type: z.literal('Polygon'), coordinates: z.tuple([ringSchema], ringSchema) });

type Coordinates = [longitude: number, latitude: number];

interface Extent {
  south: number;
  west: number;
  north: number;
  east: number;
}

// The layer's shapes and its attribute table: from the ZIP as it was downloaded, or from the unzipped .shp, which has
// its .dbf beside it.
async function openLayer(path: string): Promise<{ shp: Openable; dbf: Openable }> {
  const entries: Entry[] = [];
  if (!path.endsWith('.shp')) {
    // Left open for the two streams; the end of the command closes it.
    const zip = await yauzl.openPromise(path, { autoClose: false });
    for await (const entry of zip.eachEntry()) {
      entries.push(entry);
    }
    const shp = entries.find(({ fileName }) => LAYER.test(fileName));
    const dbf = entries.find(({ fileName }) => fileName === shp?.fileName.replace(/\.shp$/u, '.dbf'));
    if (shp !== undefined && dbf !== undefined) {
      return { shp: await zip.openReadStreamPromise(shp), dbf: await zip.openReadStreamPromise(dbf) };
    }
  } else if (LAYER.test(basename(path))) {
    return { shp: path, dbf: path.replace(/\.shp$/u, '.dbf') };
  }
  throw new Error(`${basename(path)} is not the national map's building layer, whose files are N3A_B0010000_….shp`);
}

// The outer ring in longitude and latitude, to seven decimals as OpenStreetMap's. A courtyard, an inner ring, is left
// out, so that a position in it is in the building.
function outlineOf(geometry: unknown): Coordinates[] {
  const [outer] = polygonSchema.parse(geometry).coordinates;
  return outer.map((point): Coordinates => {
    const [longitude, latitude] = FROM_EPSG_5179.forward(point);
    return [Number(longitude.toFixed(7)), Number(latitude.toFixed(7))];
  });
}

// The layer's buildings with a point in the campus extent, each as a GeoJSON feature under the layer's identifier,
// with its label.
export async function nationalMapBuildings(path: string, campus: Extent): Promise<object[]> {
  const { shp, dbf } = await openLayer(path);
  // No file of the layer names the attribute table's encoding. The table's language byte says EUC-KR, and every label
  // of the file reads as EUC-KR.
  const records = await shapefile.open(shp, dbf, { encoding: 'euc-kr' });
  const features = [];
  // oxlint-disable-next-line no-await-in-loop -- one record at a time, as the file holds them
  for (let record = await records.read(); !record.done; record = await records.read()) {
    const { UFID, KIND, ANNO } = attributesSchema.parse(record.value.properties);
    if (KIND === BUILDING) {
      const outline = outlineOf(record.value.geometry);
      const reachesCampus = outline.some(
        ([longitude, latitude]) =>
          campus.west <= longitude && longitude <= campus.east && campus.south <= latitude && latitude <= campus.north,
      );
      if (reachesCampus) {
        features.push({
          type: 'Feature',
          id: UFID,
          properties: { label: ANNO },
          geometry: { type: 'Polygon', coordinates: [outline] },
        });
      }
    }
  }
  if (features.length === 0) {
    throw new Error(
      `${basename(path)} holds no building in the campus extent: the campus is in another of the layer's files`,
    );
  }
  return features;
}
