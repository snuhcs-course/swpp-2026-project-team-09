/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { APP_SEAT_NAMES, appNameOf, appTitleOf } from '../src/assistant/library/app-names.js';
import { CATALOGUE_FILE, type Catalogue, readCatalogue } from '../src/assistant/library/catalogue.js';

// The names the model is given for 관정관's spaces are the app's (P05 ticket 66): on the user's phone, "거기 몇 층이야?"
// over the seat card of 8층 정숙 열람실 was answered with the library's "8A 열람실 1 구역(QUIET ZONE)".

let catalogue: Catalogue;

beforeAll(async () => {
  catalogue = await readCatalogue(CATALOGUE_FILE);
});

const APP_FILE = new URL('../../mobile/src/library/cards/seat-rooms.ts', import.meta.url);

const spaceOf = (id: string): Parameters<typeof appTitleOf>[0] => {
  const space = catalogue.byId.get(id);
  if (space === undefined) {
    throw new Error(`No space ${id}`);
  }
  return space;
};

describe("The app's names of 관정관's spaces", () => {
  it("are the short names of the app's seat card, mobile/src/library/cards/seat-rooms.ts", () => {
    const source = readFileSync(APP_FILE, 'utf8');
    const names = Object.fromEntries(
      [...source.matchAll(/^ {2}'([0-9A-Za-z-]+)': \{ short: '([^']+)'/gmu)].map(([, id, short]) => [id, short]),
    );

    expect(names).toEqual(APP_SEAT_NAMES);
  });

  it("call a seat space by the app's name with its floor, never by the sector", () => {
    expect(appTitleOf(spaceOf('8F-8A-zone1-quiet'))).toBe('관정 8층 정숙 열람실');
    expect(appNameOf(spaceOf('8F-8A-zone1-quiet'))).toBe('8층 정숙 열람실');
    expect(appNameOf(spaceOf('7F-7A-zone2'))).toBe('7층 열람실');
    expect(appNameOf(spaceOf('7F-7B-notebook'))).toBe('7층 7B 노트북존');
    expect(appNameOf(spaceOf('8F-grad-reading-room'))).toBe('8층 대학원 열람실');
  });

  it("keep the catalogue's label for a room", () => {
    expect(appTitleOf(spaceOf('4F-group-6'))).toBe('관정 4층 6인실');
  });

  it('name every seat space of the catalogue', () => {
    const seats = catalogue.spaces.filter(({ id }) => id in APP_SEAT_NAMES);

    expect(seats).toHaveLength(Object.keys(APP_SEAT_NAMES).length);
  });
});
