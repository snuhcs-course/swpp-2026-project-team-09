/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';
import { fileSchema, spaceOf } from './catalogue-file.js';

// The 관정관 space catalogue (kwanjeong-spaces.yaml): each space of the booking site the Assistant knows, what it is
// for, the words Users call it by, and the rules of its kind. It is read once when the server starts; a file that does
// not parse or does not match stops the start. Nothing here is live: seats and bookings stay on the phone.

// From src/ and from dist/ alike, since both lie at the same depth below main-server/ and the image keeps src/.
export const CATALOGUE_FILE = fileURLToPath(
  new URL('../../../src/assistant/library/kwanjeong-spaces.yaml', import.meta.url),
);

// Injection token of the catalogue, read by the factory in AssistantModule.
export const LIBRARY_CATALOGUE = 'LIBRARY_CATALOGUE';

// 관정관 is Place 62-1 of the shared seed.
export const KWANJEONG_PLACE_NUMBER = '62-1';

// How a space is answered for a User: bookable online and in scope, used on site only, outside the app's scope, or
// not for this User (대학원 열람실 for anyone whose 소속 is not 대학원).
export type SpaceStatus = 'implemented' | 'notOnline' | 'unsupported' | 'notEligible';

// A seat sector books one seat for one person; a room sector books a room for the people it holds.
export type SpaceUnit = 'seat' | 'room';

export interface ClockRange {
  open: string;
  close: string;
}

// The rooms of a sector a User can ask for by their equipment or name, such as 4층 6인실's rooms with a monitor.
export interface EquipmentGroup {
  id: string;
  equipment: string | null;
  rooms: string[];
  seatNos: number[];
}

export interface LibrarySpace {
  id: string;
  name: string;
  floor: number | null;
  kind: string | null;
  purpose: string;
  aliases: string[];
  bookable: boolean;
  implemented: boolean;
  whyNot: string | null;
  roomNo: number | null;
  sectorNo: number | null;
  seatNos: number[];
  unit: SpaceUnit | null;
  hours: ClockRange | null;
  closedOnSunday: boolean;
  minMinutes: number;
  maxMinutes: number;
  stepMinutes: number;
  bookingAheadDays: number;
  // GR_MIN and GR_MAX as numbers, the applicant included. Null for a seat.
  capacity: { min: number; max: number } | null;
  useDescOptions: string[] | null;
  pledge: string | null;
  notes: string[];
  mapImage: { width: number; height: number } | null;
  // A seat sector's labels: "7001"–"7192", or "S001"–"S194".
  seatLabels: { prefix: string; from: number; to: number; digits: number } | null;
  // A room's name to its seat number, for a room sector.
  rooms: Map<string, number>;
  equipmentGroups: EquipmentGroup[];
  // Only Users of this 소속 may book it.
  forAffiliation: string | null;
}

export interface Catalogue {
  readonly spaces: readonly LibrarySpace[];
  readonly byId: ReadonlyMap<string, LibrarySpace>;
}

// "0:30–3:00 …" or "09:00–23:00 …": the first range of clock times in the text.
// What a space bookable online must have for the tools to check a request and fill a card.
function problemsOf(space: LibrarySpace): string[] {
  if (!space.implemented || !space.bookable) {
    return [];
  }
  const problems: string[] = [];
  const missing = (what: string, absent: boolean): void => {
    if (absent) {
      problems.push(`has no ${what}`);
    }
  };
  missing('roomNo', space.roomNo === null);
  missing('sectorNo', space.sectorNo === null);
  missing('floor', space.floor === null);
  missing('kind of seat or room', space.unit === null);
  missing('hours', space.hours === null);
  missing('duration', space.maxMinutes === 0);
  if (space.unit === 'seat') {
    missing('seat_labels', space.seatLabels === null);
    missing('mapImage', space.mapImage === null);
  }
  if (space.unit === 'room') {
    missing('capacity', space.capacity === null);
    missing('useDesc', space.useDescOptions === null);
    missing('seatNos', space.seatNos.length === 0);
  }
  if (space.roomNo !== null && space.sectorNo !== null && !String(space.sectorNo).startsWith(String(space.roomNo))) {
    problems.push(`has sectorNo ${space.sectorNo} outside its roomNo ${space.roomNo}`);
  }
  return problems.map((problem) => `${space.id} ${problem}`);
}

function repeats<Value>(values: readonly Value[]): Value[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

// Every id, sectorNo and seatNo once; a roomNo on one floor, since the sectors of one room share it.
function repeatsOf(spaces: readonly LibrarySpace[]): string[] {
  const roomFloors = new Map<number, Set<number | null>>();
  for (const { roomNo, floor } of spaces) {
    if (roomNo !== null) {
      roomFloors.set(roomNo, (roomFloors.get(roomNo) ?? new Set()).add(floor));
    }
  }
  return [
    ...repeats(spaces.map(({ id }) => id)).map((id) => `The id ${id} repeats`),
    ...repeats(spaces.flatMap(({ sectorNo }) => (sectorNo === null ? [] : [sectorNo]))).map(
      (sectorNo) => `The sectorNo ${sectorNo} repeats`,
    ),
    ...repeats(spaces.flatMap(({ seatNos }) => seatNos)).map((seatNo) => `The seatNo ${seatNo} repeats`),
    ...[...roomFloors].flatMap(([roomNo, floors]) =>
      floors.size > 1 ? [`The roomNo ${roomNo} lies on several floors`] : [],
    ),
  ];
}

export function catalogueOf(file: unknown): Catalogue {
  const { common, spaces: entries } = fileSchema.parse(file);
  const spaces = entries.map((entry) => spaceOf(entry, entry.common === undefined ? undefined : common[entry.common]));
  const problems = [...spaces.flatMap((space) => problemsOf(space)), ...repeatsOf(spaces)];
  if (problems.length > 0) {
    throw new Error(problems.join('; '));
  }
  return { spaces, byId: new Map(spaces.map((space) => [space.id, space])) };
}

// Read once when the server starts. A file that does not parse or does not match stops the start with the reason.
export async function readCatalogue(file: string): Promise<Catalogue> {
  try {
    return catalogueOf(parse(await readFile(file, 'utf8')));
  } catch (error) {
    const reason = error instanceof z.ZodError ? z.prettifyError(error) : String(error);
    throw new Error(`${file} is not a valid space catalogue: ${reason}`, { cause: error });
  }
}

// How the space is answered for a User of this 소속. A space bookable online but outside the app's scope stays
// unsupported; one inside 관정관 that cannot be booked online (it has a roomNo) is used on site.
export function statusOf(space: LibrarySpace | undefined, affiliation: string | null): SpaceStatus {
  if (space === undefined) {
    return 'unsupported';
  }
  if (!space.bookable && space.roomNo !== null) {
    return 'notOnline';
  }
  if (!space.implemented || !space.bookable) {
    return 'unsupported';
  }
  if (space.forAffiliation !== null && space.forAffiliation !== affiliation) {
    return 'notEligible';
  }
  return 'implemented';
}

// Whether a label names a seat of the sector: "7193" or "7193번" in 7193–7670.
export function seatLabelOf(space: LibrarySpace, seat: string): string | null {
  const label = seat.trim().replace(/번$/u, '').toUpperCase();
  const { seatLabels } = space;
  if (seatLabels === null) {
    return [...space.rooms.keys()].find((room) => room.toUpperCase() === label) ?? null;
  }
  const match = new RegExp(`^${seatLabels.prefix}(\\d{${seatLabels.digits}})$`, 'u').exec(label);
  const number = match === null ? NaN : Number(match[1]);
  return number >= seatLabels.from && number <= seatLabels.to ? label : null;
}
