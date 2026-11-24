/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions of a path: each kind's routes, with and without a trailing slash; a neighbour that shares a prefix; an
// ordinary route.

import { keepsBodies } from '../src/common/bodiless-routes.js';

describe('A request line without bodies', () => {
  it.each([
    ['a position uploaded, or the positions read', '/positions'],
    ['the same with a trailing slash', '/positions/'],
    ["a walking route, from the User's position", '/walking-route'],
    ['the profile', '/users/me/profile'],
    ['the lobby, which answers the profile', '/lobby'],
    [
      "a room request's companions, with their 학번",
      '/library/room-requests/0b4f5a52-0000-4000-8000-000000000001/companions',
    ],
    ['a timetable picture', '/timetable/readings'],
    ['an Assistant message', '/assistant/messages'],
    ['an Assistant answer', '/assistant/answers'],
    ['an Assistant tap', '/assistant/taps'],
    ["the shuttles' positions collected", '/shuttle/vehicles/collected'],
    ["the shuttles' positions read", '/shuttle/vehicles'],
  ])('%s → no bodies', (_case, path) => {
    expect(keepsBodies(path)).toBe(false);
  });

  it.each([
    ['a Quest', '/quests/65298f3b-0000-4000-8000-000000000002'],
    ['the signed-in User', '/users/me'],
    ['the Master Switch', '/users/me/master-switch'],
    ['a room request', '/library/room-requests/0b4f5a52-0000-4000-8000-000000000001'],
    ['a Place at a position, whose query is not on the line', '/places/at'],
    ['a path that only starts like one', '/positionsx'],
    ["the shuttle's route and stops", '/shuttle'],
    ["the shuttle's stops collected", '/shuttle/stops/collected'],
  ])('%s → bodies kept', (_case, path) => {
    expect(keepsBodies(path)).toBe(true);
  });
});
