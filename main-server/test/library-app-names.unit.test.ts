/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { APP_SEAT_NAMES, appNameOf, appTitleOf } from '../src/assistant/library/app-names.js';
import { CATALOGUE_FILE, type Catalogue, readCatalogue } from '../src/assistant/library/catalogue.js';

// The names the model is given for 관정관's spaces are the app's (P05 ticket 66): on the user's phone, "거기 몇 층이야?"
// over the seat card of 8층 정숙 열람실 was answered with the library's "8A 열람실 1 구역(QUIET ZONE)".

let catalogue: Catalogue;
// The app's own `shortName`, read from the module, so that how its file is laid out does not matter.
let appShortName: (space: { id: string; name: string }) => unknown;

const APP_FILE = new URL('../../mobile/src/library/cards/seat-rooms.ts', import.meta.url);

beforeAll(async () => {
  catalogue = await readCatalogue(CATALOGUE_FILE);
  // A path computed at run time, so that the types of the app, with its own aliases, stay out of this project's.
  const app: unknown = await import(APP_FILE.href);
  const shortName: unknown = app !== null && typeof app === 'object' ? Reflect.get(app, 'shortName') : undefined;
  if (typeof shortName !== 'function') {
    throw new TypeError(`${APP_FILE.pathname} exports no shortName`);
  }
  appShortName = (space): unknown => Reflect.apply(shortName, undefined, [space]);
});

const spaceOf = (id: string): Parameters<typeof appTitleOf>[0] => {
  const space = catalogue.byId.get(id);
  if (space === undefined) {
    throw new Error(`No space ${id}`);
  }
  return space;
};

describe("The app's names of 관정관's spaces", () => {
  it("are the short names the app's seat card gives every seat space of the catalogue", () => {
    const seats = catalogue.spaces.filter(({ unit }) => unit === 'seat');
    const app = Object.fromEntries(seats.map(({ id, name }) => [id, appShortName({ id, name })]));
    const ours = Object.fromEntries(seats.map(({ id, name }) => [id, APP_SEAT_NAMES[id] ?? name]));

    expect(app).toEqual(ours);
    expect(Object.keys(APP_SEAT_NAMES).every((id) => id in app)).toBe(true);
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
});
