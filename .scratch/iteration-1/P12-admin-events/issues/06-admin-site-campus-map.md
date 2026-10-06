# 06: Admin site: the campus map with every Place and its outlines

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Reading Global Events: the administrative API's lists and the User's list), 03 (Admin site: signing in and out, and the Administrators screen)

## What to build

The admin site's Places page shows Kakao's map of the campus through Kakao's JavaScript SDK, with every Place drawn on it: a Place with outlines as its polygons, a Place without one as a marker at its position, each labelled with its number, or with its name when it has none. An Administrator finds a Place by its number or its name, or clicks it on the map, and the page selects it and shows its record: number, name, origin, position, and each outline with the file it came from and its id there. The page shows how the seed placed and outlined the Places, so that a wrong Place or outline is noticed and corrected in the seed files (main server README: Seed data).

The list comes from `GET /admin/places`, which ticket 01 adds in the form of `GET /places`. That form has no outlines, and the database keeps only their rings, so this ticket has the seed store each outline with its source and its id, and adds the origin and the outlines to the administrative answer. `GET /places` keeps its form.

The map is its own Client Component, not ticket 05's position picker. Loading the SDK with `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` is shared with ticket 05: whichever of the two is built first adds the loading and the setting, and the other uses them.

## Acceptance criteria

- [ ] Loading the seed stores each outline of a Place as `{ "source": "national_map", "id": "B0010000000RF2ENL", "ring": [...] }` or `{ "source": "openstreetmap", "id": "way/193893586", "ring": [...] }`, the id being the one its outline file gives. Loading again rewrites every Place's outlines in this form. `PlaceLookup` reads the rings of this form and answers as before, and the comment on `Place.outlines` in the schema describes it.
  - Dropped: the outlines stay stored as rings; see Differences below.
- [x] `GET /admin/places` answers each Place, in the order of `GET /places`, as `{ id, number, name, latitude, longitude, origin, outlines }`, where `origin` is `campus_map`, `openstreetmap` or `national_map` and `outlines` the stored list, `[]` for a Place without one. `GET /places`, `GET /places/search` and `GET /places/at` answer as before, without outlines.
- [x] Main server tests at the API: a Place with an outline of the national map, `100` with OpenStreetMap's `way/193893586` from `place-outlines.json`, and `253`, which the file leaves without one; the order of `GET /places`; `GET /places` without outlines; a User's token on `GET /admin/places` refused. The tests of `PlaceLookup` and `GET /places/at` pass unchanged.
- [x] The Places page, at `/places`, reads `GET /admin/places` on the server and hands the list to the map. The map shows the campus, each outline as a polygon, drawn once when several Places share it, each Place without an outline as a marker, and each Place's number or name as a label at its position. Kakao's map type control switches to the sky view.
- [x] A search box finds Places as `GET /places/search` does, over the list on the page: a name that holds the text, whatever the case of its Latin letters, and the Place whose number is the text, with or without `동`. Choosing a result selects the Place.
- [x] Clicking a Place's polygon, marker or label selects it. On an outline that several Places share, the record lists them all, and choosing one selects it.
- [x] The selected Place is highlighted on the map, which moves to it. The record shows its number, its name, its origin, its latitude and longitude, and each outline with its source and id, or that it has none.
- [x] The page shows the attributions that OpenStreetMap's licence and the national map's 공공누리 type 1 ask for, as the seed files carry them.
- [x] The map is a Client Component that receives the Places and the selected Place and reports a click on a Place, and nothing of the session.
- [x] Page-level tests with Vitest and React Testing Library against a fake of the main server, with the map replaced by a fake that reports a chosen Place: the list handed to the map; a search by number, by number with `동`, by name and one that finds nothing; a choice from the results and a click on the map selecting the Place; the record of a Place with outlines of each source, of one without any, and of an outline that several Places share.
- [ ] The map is checked by hand on `http://localhost:3100`: it appears, every Place is drawn, a search and a click select a Place and show its record. The ticket's comments record the check.
  - Not checked by hand: see For a person below.
- [x] The main server's README records the stored form of an outline and `GET /admin/places` in Places and Seed data, and no longer says that no route serves the outlines. The admin site's README records the Places page.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/` and `admin/`.
  - In `main-server/` the three checks and `test/admin-places.e2e-spec.ts` alone were run, not the whole suite.

## Comments

### Differences (2026-10-06)

- The outlines stay stored as they are, rings of `{ latitude, longitude }`, with no source or id per outline and no
  reseed. `GET /admin/places` serves the rings, and the record shows each outline's number of points instead of its
  file and id. The tests of "outlines of each source" check the record of Places of different origins instead.

### Decisions (2026-10-06)

- **API**, in its own commit: `AdminPlacesController` (`src/places/admin-places.controller.ts`) answers
  `PlacesService.listForAdministrators()`, the Places in `byNumber` order as `AdminPlaceDto`
  (`src/places/dto/admin-place.dto.ts`): `PlaceDto` with `origin` and `outlines`, parsed from the stored JSON.
  `test/admin-places.e2e-spec.ts` checks the order and fields against `GET /places`, that `GET /places` has no
  outlines, 301's outlines, 100's one outline (`way/193893586` in `place-outlines.json`), 253's none, and a User's
  token refused with 401.
- **Page**: `/places`, a menu section after Events. `places-view.tsx` holds the search, the selection and the record;
  `places-map.tsx` is the Kakao map, sharing `useKakaoMap()` in `src/kakao-maps.ts` with ticket 05's map. An outline is
  drawn once per identical ring; a click on a shared outline selects the first Place of the list that has it, and the
  record lists the others as buttons. Labels are small HTML buttons in Kakao custom overlays; the selected Place's
  outlines and label turn red. The search is the event form's `placesMatching()`, the first 10 results.
- **Tests**: `__tests__/places.test.tsx`, with the map replaced by `support/fake-places-map.tsx`.

### For a person

- With the Kakao key in `admin/.env`, open `/places` on `http://localhost:3100` against a main server with the seed
  loaded: check that the map appears, that every Place is drawn (polygons, markers for Places without an outline,
  labels), that the sky view switch works, and that a search and a click select a Place, highlight it and show its
  record. Record the check here. Not done by the agent: the Kakao drawing is covered only by the fake map.

### Agent usage (2026-10-06)

- Agent time: about 20 minutes, an estimate, for one implementing agent, the API commit included; the session that
  ran it is not counted.
- Tokens: about 2M input, nearly all cache reads, and a few thousand output tokens, an estimate from the agent's own
  context; the transcript was not measured.
