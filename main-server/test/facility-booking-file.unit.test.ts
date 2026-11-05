/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readCampusBoundary } from '../src/common/campus-boundary.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import {
  BOOKING_HOSTS,
  FACILITY_BOOKING_FILE,
  type FacilityBookingEntry,
  facilityBookingFileSchema,
  namesPlace,
} from '../src/assistant/facility-booking.js';
import { readSeedPlaces } from '../src/places/places.seed.js';

// seed/facility-booking.json, read as the server reads it, against the Places of the seed files.

let facilities: FacilityBookingEntry[];
let places: Awaited<ReturnType<typeof readSeedPlaces>>;

beforeAll(async () => {
  ({ facilities } = await readSeedFile(SEED_DIRECTORY, FACILITY_BOOKING_FILE, facilityBookingFileSchema));
  places = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
});

function nameOf(entry: FacilityBookingEntry): string {
  return 'number' in entry ? entry.number : entry.name;
}

describe('seed/facility-booking.json', () => {
  it('parses, with entries', () => {
    expect(facilities.length).toBeGreaterThan(0);
  });

  it('links only the booking site each entry names, over https', () => {
    for (const { site, url } of facilities) {
      const { protocol, hostname } = new URL(url);
      expect({ protocol, hostname }).toEqual({ protocol: 'https:', hostname: BOOKING_HOSTS[site] });
    }
  });

  it('names exactly one Place of the seed with each entry', () => {
    for (const entry of facilities) {
      expect({ entry: nameOf(entry), places: places.filter((place) => namesPlace(entry, place)).length }).toEqual({
        entry: nameOf(entry),
        places: 1,
      });
    }
  });

  it('names each Place once', () => {
    const named = facilities.map((entry) => nameOf(entry));
    expect(new Set(named).size).toBe(named.length);
  });
});
