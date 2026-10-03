# 06: Places and their outlines from the national map

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The entries of the campus's list are Places: a building with its number, such as 제1공학관 (301동), or a spot without one, such as 종합운동장 and 자하연. The table, the routes, the lookup and the seed files say Place, and nothing treats a building apart from the other Places.

A Place's outlines come from the 국토지리정보원's 연속수치지형도 건물 layer instead of OpenStreetMap, and a Place may have several outlines. On this campus the layer draws more of the buildings, its outlines lie closer to the buildings as Kakao's map draws them, and its labels carry the building numbers, so that an outline is linked to a Place by its number rather than by where a point happens to lie. `.scratch/research/public-building-outlines.md` §9 has the comparison, a person's check of every large difference, and the decisions this ticket carries out.

The layer is downloaded by a person from VWorld, behind a login, and stays outside the repository. The export command reads the downloaded file and writes a seed file with the campus's polygons. OpenStreetMap's outlines remain where a file of the seed names them: for the Places the layer does not draw, among them the sports fields, the tennis courts and 자하연. Four buildings that the campus map's list lacks are added as Places from the layer. The Campus Boundary and the rules of the Place at a position (ticket 03) stay as they are; that lookup answers from all of a Place's outlines.

## Acceptance criteria

- [x] `pnpm seed:export` has an export that takes the path of the downloaded layer file, the ZIP or its unzipped `.shp`, and writes a seed file of the polygons that reach the campus extent and that the layer classes as buildings (`KIND` `BDK004`). Wall-less structures, temporary buildings and greenhouses are left out. Each polygon keeps the layer's identifier (`UFID`) and its label (`ANNO`), with its coordinates converted from EPSG:5179 to longitude and latitude, so that the server converts nothing.
- [x] The seed file keeps the page it was downloaded from, the name of the downloaded file, the day of the export and the notice its licence asks for: the source, 국토지리정보원, under 공공누리 type 1. It is formatted by Prettier like the other seed files. The downloaded file itself is not in the repository.
- [x] The export refuses a file that is not this layer, and a file that holds no building in the campus extent, saying that the campus is in another of the layer's files.
- [ ] The conversion of coordinates has a test of its own: the function that converts a point is given a point of the layer and answers the longitude and latitude known apart from the code.
- [ ] The list's entries are Places everywhere: the table `places`, the routes `GET /places` and `GET /places/search`, the lookup's answer `{ place, relation }`, the module and the seed files `campus-map-places.json`, `openstreetmap-places.json`, `national-map-outlines.geojson`, `openstreetmap-outlines.geojson` and `place-outlines.json`. `GLOSSARY.md` defines Place.
- [ ] A Place is linked to its outlines in this order, numbered or not:
  1. every polygon whose label names the Place's number as `<number>동`, the whole number: `1동` is not in `101동`, and `25동` is not in `25-1동`. A letter after the number is a wing: `919-A동` names 919동;
  2. without such a label, the polygon that holds the Place's position, the larger when two do, also when another Place has it;
  3. without that, the nearest polygon within 10 m that no Place has, the nearest Place first.
- [ ] `place-outlines.json` gives a Place a list of outlines of either source, or an empty list for none, each entry with its reason. An entry names its Place by the number or, for a Place without one, by the name, and is refused when it names no Place or several, or an outline the seed does not hold. It holds:
  - 버들골 풍산마당 (100동), 데이터사이언스대학원 (43-2동) and 종합운동장본부석 (149동), each with one outline of OpenStreetMap; 화학관연결동 (253동) with none; 반도체교육관 (104-1동) with its own polygon alone;
  - 대학원연구동(2단계) (500동) with the four polygons labelled `501동` to `504동`, which the campus map counts as parts of 500동;
  - 종합운동장 with OpenStreetMap's `대운동장`, 야구장, 관악사운동장 and 자하연 with one outline each, 테니스장 with five and 공대테니스장 with two.
- [ ] The OpenStreetMap outline seed holds only the outlines that file names, exported by their identifiers.
- [ ] `national-map-places.json` adds the Places that the campus map's list lacks, each by one polygon of the layer, with its name and, where one is known, its number: 해동첨단공학관 (303동), 삼성전자서울대연구소 (944동), 디자인연구동 (49-1동) and 배터리공동연구센터. Such a Place's origin is the national map, its identifier there the polygon's, and its position the centre of the polygon's bounding box.
- [ ] A Place stores its outlines as a list of closed rings in ordinary columns, with one migration from the schema of `1.0/Main`. No spatial type is used.
- [x] The Place at a position: a Place is as far as its nearest outline, and at no distance when any of its outlines holds the position. `inside` within 5 m, `near` up to 20 m, the nearer wall between two Places, and the nearer position among the Places of one outline stay as they are.
- [ ] Tests of the seed command against the real database: a Place linked by its label, by a wing's label, by its position, and within 10 m beside a polygon another Place has; a Place with several outlines; a wall-less polygon that is no Place's outline; entries of `place-outlines.json` that give an OpenStreetMap outline, several outlines, an outline to a Place named by its name, and none; an entry naming an unknown outline or Place refused; a Place added from the layer.
- [ ] Tests of the Place at a position on the started server, with positions and distances worked out apart from the server's code: the cases of ticket 03 against the new outlines, a position inside the second outline of a Place, a position on the field of 종합운동장, and one in its stand, which is 종합운동장본부석.
- [ ] The main server's README says where the layer is downloaded, which of its files holds the campus and how the export tells when it does not, how the exports and `place-outlines.json` work, and both licences. The specs that name the list say Place.
- [ ] The ticket records how many of the Places have an outline after the change, and which do not.

## Comments

### Decisions made while implementing (2026-10-03)

The main server's README says, under Buildings and Seed data, how the outlines are exported, loaded and corrected. The facts of the data are here and in the seed files.

- **The seed file is `seed/national-map-building-outlines.geojson`**, a GeoJSON FeatureCollection as OpenStreetMap's is, so that GitHub draws it. A feature's `id` is the layer's `UFID`, `properties.label` its `ANNO`, or `null` where the layer writes none. The top of the file keeps `exportedFrom`, the download page, `file`, the name of the downloaded file, `exportedOn` and `attribution`.
  - The notice names 국토지리정보원, the layer, VWorld and 공공누리 type 1. It gives no year: the model wording of 공공누리 names the year the work was made, and neither the download page nor the file states one.
- **`pnpm seed:export national-map-building-outlines <path>`**: the path follows the name. The other exports take no path, and several names in one command still work.
- **A polygon reaches the campus extent when one of its points lies in it**, in longitude and latitude. On this file that gives the same 356 polygons as a true intersection with the extent.
- **A courtyard is left out**, as ticket 03 decided for OpenStreetMap: six of the 356 have inner rings, those of 38동, 39동, 61동, 70동, 71동 and 82동. Every record of the file is one polygon; a record of several would stop the export.
- **The attribute table is read as EUC-KR.** No `.cpg` names the encoding. The table's language byte is `0x4E`, Korean in code page 949, which the `euc-kr` decoder reads, and every value of the 2.2 million records that is not ASCII decodes as CP949; 84 of them also decode as UTF-8, by chance. The labels of the 356 polygons are the same by both reads.
- **`BDK004` alone is kept**, as the criterion says. The whole file has eight kinds, `BDK001` to `BDK008`; the campus extent has none of `BDK001` to `BDK003`.
- **Dev dependencies, for the export alone**: `shapefile` reads the `.shp` and the `.dbf`, `proj4` converts the coordinates, and `yauzl` reads the two files out of the ZIP as streams, so nothing is unzipped to disk. `@types/shapefile` and `@types/yauzl` come with them. Nothing was added to what the server needs to run.
- **The layer is read in `scripts/national-map.ts`**, beside `scripts/export-seed.ts`, which would otherwise pass oxlint's 300 lines. A script imports another by its `.ts` name, as Node runs it, which TypeScript accepts with `rewriteRelativeImportExtensions` in `tsconfig.json`. The build covers `src/` alone and is not changed by it.
- **The export takes about 80 seconds**: it reads all 2.2 million records in the order of the file, since a ZIP's member cannot be read from the middle.
- **Within 10 m, the nearest polygon decides**: a building without a label and outside every polygon takes the nearest polygon when it is within 10 m and no building has it. When a building has the nearest polygon, the building beside it gets none, as before. This reading gives the 5 that the decision counted. The other reading, the nearest of the polygons that no building has, gives 7: 인문관연결동 (250동) would take a polygon of 70 m² without a label and 다목적차량보관소 (332동) one of 134 m².
- **A correction gives one outline, which replaces all that the rules gave**, or none. Its identifier is looked up in both files: a `UFID` of the national map or OpenStreetMap's `way/…`.
- **The OpenStreetMap export reads the corrections file** and asks Overpass for the outlines it names, by their identifiers. It refuses an answer that lacks one. Relations are still read, though the three outlines are ways.
- **`buildings.outlines` is a list of rings, not null**, empty for a place or a building without an outline: `JSONB NOT NULL DEFAULT '[]'`. The migration, `20261002192950_several_outlines_per_building`, drops `outline` and adds `outlines`. A database that ran `add_buildings` migrates in place, and the next loading of the seed fills the column: it need not be recreated.
- **The lookup measures each building to the nearest of its outlines** and remembers which outline that was. Two buildings at the same distance share an outline when that outline is the same ring, and then the nearer position wins, as before.
- **The outline tests have a file of their own**, `test/seed-outlines.e2e-spec.ts`, since `test/seed.e2e-spec.ts` would pass 300 lines. Both make their database with `createDatabase()` in `test/containers.ts`.

### The numbers (2026-10-03)

- The seed holds 356 polygons with 6,029 points; 233 have a label.
- Before the corrections 202 of the 218 numbered buildings have an outline: 174 by a label, 23 by their position and 5 within 10 m.
- **After the corrections 204 have an outline**: 173 by a label, 22 by their position, 5 within 10 m (104-2, 128, 207, 251 and 506) and 4 by a correction (100, 43-2, 149 and 104-1).
- Two labels name a wing: (관악사)학부 생활관 (919동) takes the three polygons labelled `919-A동`, `919-B동` and `919-C동`, and BK국제관 (946동) the one labelled `946-A동`, which holds its position too.
- **14 have none**:
  - 김철수물리관 (56-1동) and 정문수위실 (115동);
  - four links between buildings: 인문관연결동 (250동), 화학관연결동 (253동), 물리관연결동 (254동) and 예능관연결동 (255동);
  - eight stores and small buildings: 야외조각실습장2 (52-2동), 영선공장 (68-2동), 폐기물창고 (98-2동), 정구장관리실 (99-1동), 반도체연구소수소창고 (104-3동), 간이식당1 (110동), 양수장 (117동) and 다목적차량보관소 (332동).
- Ten buildings have several outlines: 16동 five, 42동 and 919동 three, and 50, 59, 66, 72, 73, 105 and 901 two each. The buildings have 219 outlines in all.
- Seven polygons are the outline of two buildings each: 10 and 252, 52 and 52-1, 59 and 59-1, 105 and 105-1, 105 and 105-2, 140 and 140-1, and 901 and 906.
- No building's position lies in two of the 356 polygons, so "the larger when two do" decides nothing on today's data. Its test adds two polygons to a copy of the seed.
- **One label of the layer is wrong, and a correction sets it right.** The polygon `B0010000000RF2EB9` is labelled `104-1동국제대학원` and stands at 국제대학원, 1,044 m from 반도체교육관 (104-1동). By its label it would be a second outline of 104-1동; the fifth correction leaves 104-1동 its own polygon, `B0010000000RF2ENL`, alone. By position the polygon is the outline of 국제회의동 (140-2동), which keeps it. The wrong label was found by its distance, after the build, and the correction was added on a person's word.
- The server's links were compared with a calculation apart from its code, with shapely in EPSG:5186 on the seed files: the same outlines for every one of the 218 buildings.
- The conversion was compared with PROJ for every point of the seed: the largest difference is 5 × 10⁻⁸ degrees, the rounding to seven decimals.

### Tests (2026-10-03)

- The seed command, on a database of its own: `test/seed-outlines.e2e-spec.ts` (13).
  - A point of 151동미술관 has the longitude and latitude that PROJ gives for the layer's coordinates.
  - By a label: 제1공학관; 사회과학관 with five outlines and 문화관 with two; `1동` not read out of `101동`, nor `25동` out of `25-1동`; 919동 with the three polygons of its wings, written before the rule read a wing and seen to fail.
  - Without a label: 우석경제관 by its position, and 59-1동 inside a polygon of 59동; 506동 within 10 m, 250동 not, beside the polygon of 인문관2, and of 104-2동 and 104-3동 the nearer; 물리관연결동, which the layer draws as a wall-less structure, without an outline; a place without one.
  - The larger of two polygons that hold a position.
  - The corrections: OpenStreetMap's outline for 100동 and none for 253동, against a copy of the seed without corrections; 104-1동 with two outlines without the corrections and its own alone with them, written before the fifth correction and seen to fail; a correction naming an unknown outline or an unknown building refused.
- The building at a position, on the started server: `test/building-lookup.e2e-spec.ts` (9). The cases of ticket 03 against the new outlines: inside 제1공학관; 3 m, 12 m and 30 m west of its longest wall; a place and 김철수물리관, which has no outline; inside 교직원아파트 4.5 m from 가족생활관4; between the two; and 국제대학원, 국제대학원2 and 국제회의동 each at its own position. New: inside each of 문화관's two outlines, and inside the last of 사회과학관's five.
  - The positions and the expected answers were worked out apart from the server's code, with shapely in EPSG:5186 and PROJ, from the seed files.
- `test/seed.e2e-spec.ts` (5) keeps the tests of the building list.
- Seen to fail first:
  - The seed tests were written before the loader was changed. Nine of the eleven failed. The other two were true already: the conversion, since the seed had been exported, and the refusal, a rule of ticket 03.
  - The conversion test was then seen to fail with the seed exported under a scale factor of 1 instead of 0.9996: the point lay 24 m off.
  - The lookup had to change with the column before its tests could run, so its tests passed when first run. Each rule was then broken by hand and its test seen to fail: only the first outline measured, only the last, a wall within 5 m counted as holding the position, no nearer position among the buildings of one outline, `inside` up to 20 m, `near` up to 40 m, and a building without an outline called inside.
  - The loader's rules were broken by hand in the same way, each failing its test: a number read as a part of a longer one, only the first labelled polygon, the position before the label, the smaller of two polygons, the first of two, a polygon that a building has taken again, no reach, the farthest building first, the corrections ignored, an unknown outline taking the outline away, and OpenStreetMap's outlines kept from the corrections.

### The exports (2026-10-03)

- The national map, with the committed command, from the downloaded ZIP of file 001, `(연속수치지형도)건물_001.zip`: 356 polygons in 83 seconds.
  - From the unzipped `N3A_B0010000_001.shp` the same features came out; only `file` differed.
  - Refused: the unzipped file 009, after reading all of it, with `holds no building in the campus extent: the campus is in another of the layer's files`; the `.shp` of GIS건물통합정보 and a ZIP of another dataset, as not the layer; a file that is no ZIP and an incomplete ZIP, with yauzl's message that the file is no ZIP or is truncated.
- OpenStreetMap's three outlines, the data as of 2026-10-02T19:34:41Z, asked with the query that the file keeps. Overpass was busy at first, so the committed command wrote the seed file from a saved answer, with `fetch` replaced. The three outlines are the same as in the export of 2026-10-02.

### Checks and the real start (2026-10-03)

- `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass. `pnpm test`: 26 files and 291 tests pass.
- The migration was made with `prisma migrate dev --create-only` on a temporary database of the project's PostgreSQL image, `p07-06-outlines-postgres`, since removed with its volume. After `pnpm db:migrate`, `prisma migrate diff` from that database to the schema finds no difference. `pnpm db:seed` run twice on it left 226 rows, 204 of the 218 numbered buildings with outlines.
- One start, `docker compose -p p07-06-outlines-check up --build -d postgres redis main-server` from the repository root, under a project name of its own so that the developer database was not touched:
  - The image built with the new dev dependencies, applied the four migrations, logged `Loaded 226 buildings` and started. Readiness and liveness answered 200, and `GET /buildings` and `GET /buildings/search?q=302` without a token 401.
  - The table held 226 rows: 204 numbered buildings with outlines, no place with one; 사회과학관 with five, 문화관 with two, 100동, 43-2동 and 149동 with one, 253동 with none.
  - A restart of the main server found no pending migration, loaded the seed again, and left 226 rows, 제2공학관 under the id it had.
  - `docker compose -p p07-06-outlines-check down -v --rmi local` removed the run's containers, volume and images.

### Not verified (2026-10-03)

- Whether the layer's notice needs a year, and which. The notice in the seed file has none.
- Whether 공공누리 asks for the attribution in the app when the outlines are used only on the server and never drawn. The P15 spec names both sources on the information screen.
- The links by a label were not looked at one by one against a map. One wrong label was found by its distance, that of 104-1동 above; the other labelled polygons that lie more than 10 m from their building's position are parts of buildings with several outlines, 13 to 49 m away.

### Agent usage (2026-10-03)

One session, the one that reviewed ticket 03's pull request, and two agents it started. Counted from where ticket 03's last usage section ends: the questions about the outlines' source, the research, the comparisons on the map, the person's check, this ticket, and its build.

- Agent time: about 3 hours, an estimate.
  - The session's own steps took about 112 minutes: the gaps under five minutes between them, which also count short pauses between questions.
  - The research agent worked about 24 minutes and the implementing agent about 42, each while the session waited.
- Tokens, the two agents included, counted when this section was written:
  - Input: 138,096,830 in total, of which 136,978,775 were cache reads, 1,117,279 cache writes and 776 uncached. The two agents took 43,857,872 of it.
  - Output: 295,382. The agents' transcripts record only part of their output, so this is a lower bound.
