/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type LibrarySpace, roomLabelOf } from './catalogue.js';

// The names the app gives 관정관's seat spaces (P05 ticket 66), which the model is given so that its words match what
// the User sees: "8층 정숙 열람실", never the library's sector name "8A 열람실 1 구역(QUIET ZONE)". This mirrors the
// short names of SEAT_SPACES in mobile/src/library/cards/seat-rooms.ts: both are checked against one fixture,
// test/fixtures/library/app-seat-names.json here and its copy in mobile/__tests__/fixtures.
export const APP_SEAT_NAMES: Readonly<Record<string, string>> = {
  '7F-7A-zone2': '7층 열람실',
  '7F-7A-zone1-notebook': '7A 노트북존',
  '7F-notebook-171': '171호 노트북존',
  '7F-7B-notebook': '7B 노트북존',
  '8F-8A-zone1-quiet': '8층 정숙 열람실',
  '8F-8A-zone2-notebook': '8A 노트북존',
  '8F-notebook-181': '181호 노트북존',
  '8F-grad-reading-room': '대학원 열람실',
};

// "8층 정숙 열람실", "7층 7B 노트북존": a seat space by the app's name, with its floor; any other space by the
// catalogue's label without 관정 ("4층 6인실").
export function appNameOf(space: LibrarySpace): string {
  const short = APP_SEAT_NAMES[space.id];
  if (short === undefined) {
    return roomLabelOf(space, space.id).replace(/^관정 /u, '');
  }
  const floor = space.floor === null ? '' : `${space.floor}층`;
  return floor === '' || short.startsWith(floor) ? short : `${floor} ${short}`;
}

// "관정 8층 정숙 열람실".
export const appTitleOf = (space: LibrarySpace): string => `관정 ${appNameOf(space)}`;

// The app's name of a seat space with its floor; null for any other space, which keeps the catalogue's name.
export const seatNameOf = (space: LibrarySpace): string | null =>
  APP_SEAT_NAMES[space.id] === undefined ? null : appNameOf(space);

// "8층 정숙 열람실" for a seat space, "4층 그룹스터디룸 6인실 (24 rooms)" for any other: a space as a tool's words name it.
export const spokenNameOf = (space: LibrarySpace): string => seatNameOf(space) ?? `${space.floor}층 ${space.name}`;
