/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';
import {
  CATALOGUE_FILE,
  type Catalogue,
  catalogueOf,
  type LibrarySpace,
  readCatalogue,
  seatLabelOf,
  statusOf,
} from '../src/assistant/library/catalogue.js';

let catalogue: Catalogue;

beforeAll(async () => {
  catalogue = await readCatalogue(CATALOGUE_FILE);
});

function space(id: string): LibrarySpace {
  const found = catalogue.byId.get(id);
  if (found === undefined) {
    throw new Error(`The catalogue has no ${id}`);
  }
  return found;
}

describe('The 관정 space catalogue', () => {
  it('has unique ids, sectorNos and seatNos, and each roomNo on one floor with its sectors under it', () => {
    const { spaces } = catalogue;
    const ids = spaces.map(({ id }) => id);
    const sectors = spaces.flatMap(({ sectorNo }) => (sectorNo === null ? [] : [sectorNo]));
    const seats = spaces.flatMap(({ seatNos }) => seatNos);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(sectors).size).toBe(sectors.length);
    expect(new Set(seats).size).toBe(seats.length);
    for (const { roomNo, sectorNo, floor } of spaces) {
      if (roomNo !== null && sectorNo !== null) {
        expect(String(sectorNo).startsWith(String(roomNo))).toBe(true);
        expect(spaces.filter((other) => other.roomNo === roomNo).every((other) => other.floor === floor)).toBe(true);
      }
    }
  });

  it('gives every seat sector its map size, today only and 30-minute steps, and every room 3 days ahead', () => {
    const bookable = catalogue.spaces.filter(({ implemented, bookable: online }) => implemented && online);

    expect(bookable.length).toBeGreaterThan(10);
    for (const each of bookable) {
      expect(each.stepMinutes).toBe(30);
      if (each.unit === 'seat') {
        expect(each.mapImage).not.toBeNull();
        expect(each.bookingAheadDays).toBe(0);
        expect(each.useDescOptions).toBeNull();
      } else {
        expect(each.bookingAheadDays).toBe(3);
        expect(each.capacity).not.toBeNull();
      }
    }
    expect(space('7F-7A-zone2')).toMatchObject({
      mapImage: { width: 2529, height: 1198 },
      hours: { open: '07:00', close: '23:00' },
      minMinutes: 30,
      maxMinutes: 360,
    });
    expect(space('6F-creative-media-studio')).toMatchObject({ maxMinutes: 240, capacity: { min: 1, max: 10 } });
    expect(space('6F-studio').closedOnSunday).toBe(true);
  });
});

describe('The rooms of the catalogue', () => {
  it('reads GR_MIN and GR_MAX as numbers', () => {
    expect(space('2F-group-10').capacity).toEqual({ min: 7, max: 10 });
    expect(space('2F-group-20').capacity).toEqual({ min: 11, max: 20 });
  });

  it('keeps the rooms of an equipment group with their seat numbers', () => {
    const group = space('4F-group-6').equipmentGroups.find(({ id }) => id === 'with-monitor');

    expect(group).toMatchObject({
      rooms: ['G405', 'G407', 'G411', 'G413'],
      seatNos: [14103002, 14103004, 14103008, 14103010],
    });
    expect(space('4F-group-10').rooms.get('G423')).toBe(14101003);
  });
});

describe('How a space is answered', () => {
  it.each([
    ['7F-7A-zone2', null, 'implemented'],
    ['2F-group-20', null, 'implemented'],
    ['2F-group-5-G202', null, 'notOnline'],
    ['6F-multimedia-viewing', null, 'notOnline'],
    ['6F-info-search', null, 'notOnline'],
    ['7F-carrel', null, 'notOnline'],
    ['8F-carrel', null, 'notOnline'],
    ['main-library', null, 'unsupported'],
    ['other-floors', null, 'unsupported'],
    ['8F-grad-reading-room', null, 'notEligible'],
    ['8F-grad-reading-room', 'undergraduate', 'notEligible'],
    ['8F-grad-reading-room', 'graduate', 'implemented'],
  ])('answers %s for a User of 소속 %s as %s', (id, affiliation, status) => {
    expect(statusOf(space(id), affiliation)).toBe(status);
  });

  it('answers an id outside the catalogue as unsupported', () => {
    expect(statusOf(undefined, null)).toBe('unsupported');
  });

  it.each([
    ['7F-7A-zone2', '7193', '7193'],
    ['7F-7A-zone2', '7670번', '7670'],
    ['7F-7A-zone2', '7192', null],
    ['8F-grad-reading-room', 's001', 'S001'],
    ['8F-grad-reading-room', 'S195', null],
    ['4F-group-6', 'g405', 'G405'],
    ['6F-studio', 'studio a', 'STUDIO A'],
    ['4F-group-6', 'G201', null],
  ])('reads the seat %s %s as %s', (id, seat, label) => {
    expect(seatLabelOf(space(id), seat)).toBe(label);
  });
});

describe('A bad catalogue', () => {
  it('refuses a file with a repeated id, or a bookable space without its hours', async () => {
    const file = z
      .looseObject({ spaces: z.array(z.record(z.string(), z.unknown())) })
      .parse(parse(await readFile(CATALOGUE_FILE, 'utf8')));
    const [first] = file.spaces;

    expect(() => catalogueOf({ ...file, spaces: [...file.spaces, first] })).toThrow('The id 2F-group-20 repeats');
    expect(() =>
      catalogueOf({
        ...file,
        spaces: [{ ...first, common: undefined, duration: '0:30–3:00' }, ...file.spaces.slice(1)],
      }),
    ).toThrow('2F-group-20 has no hours');
    await expect(readCatalogue('/nowhere/kwanjeong-spaces.yaml')).rejects.toThrow('is not a valid space catalogue');
  });
});
