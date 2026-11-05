/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { readSeedFile, SEED_DIRECTORY } from '../common/seed-directory.js';

// Where a Place's facilities are booked online: the button the made Proposal card shows, "시설 예약하기", and the page
// it opens. The Assistant cannot book them itself (references/ai-facility-booking.md of P13 plans how it could).
export interface FacilityBooking {
  label: string;
  url: string;
}

// The booking sites the table may link, by the host each URL must be on.
export const BOOKING_HOSTS = { athletics: 'athletics.snu.ac.kr', ssims: 'ssims.snu.ac.kr' } as const;

const booking = {
  site: z.enum(['athletics', 'ssims']),
  label: z.string().min(1),
  url: z.url({ protocol: /^https$/u }),
};

// `seed/facility-booking.json`: each entry names a Place by its number, or by its name where the seed holds it
// without one.
export const facilityBookingFileSchema = z.object({
  facilities: z.array(
    z.union([
      z.strictObject({ number: z.string().min(1), ...booking }),
      z.strictObject({ name: z.string().min(1), ...booking }),
    ]),
  ),
});

export type FacilityBookingEntry = z.infer<typeof facilityBookingFileSchema>['facilities'][number];

export const FACILITY_BOOKING_FILE = 'facility-booking.json';

let table: Promise<FacilityBookingEntry[]> | undefined;

// Read once, on the first Proposal with a Place.
function entries(): Promise<FacilityBookingEntry[]> {
  table ??= readSeedFile(SEED_DIRECTORY, FACILITY_BOOKING_FILE, facilityBookingFileSchema).then(
    ({ facilities }) => facilities,
  );
  return table;
}

// Whether an entry names this Place: by its number, or by its name for a Place without one.
export function namesPlace(entry: FacilityBookingEntry, place: { number: string | null; name: string }): boolean {
  return 'number' in entry ? entry.number === place.number : place.number === null && entry.name === place.name;
}

// The booking page of a Place, or null where none is known.
export async function facilityBookingOf(place: {
  number: string | null;
  name: string;
}): Promise<FacilityBooking | null> {
  const entry = (await entries()).find((candidate) => namesPlace(candidate, place));
  return entry === undefined ? null : { label: entry.label, url: entry.url };
}
