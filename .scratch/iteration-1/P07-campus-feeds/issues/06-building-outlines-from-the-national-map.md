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
- [x] The conversion of coordinates has a test of its own: the function that converts a point is given a point of the layer and answers the longitude and latitude known apart from the code.
- [x] The list's entries are Places everywhere: the table `places`, the routes `GET /places` and `GET /places/search`, the lookup's answer `{ place, relation }`, the module and the seed files `campus-map-places.json`, `openstreetmap-places.json`, `national-map-outlines.geojson`, `openstreetmap-outlines.geojson` and `place-outlines.json`. `GLOSSARY.md` defines Place.
- [x] A Place is linked to its outlines in this order, numbered or not:
  1. every polygon whose label names the Place's number as `<number>동`, the whole number: `1동` is not in `101동`, and `25동` is not in `25-1동`. A letter after the number is a wing: `919-A동` names 919동;
  2. without such a label, the polygon that holds the Place's position, the larger when two do, also when another Place has it;
  3. without that, the nearest polygon within 10 m that no Place has, the nearest Place first.
- [x] `place-outlines.json` gives a Place a list of outlines of either source, or an empty list for none, each entry with its reason. An entry names its Place by the number or, for a Place without one, by the name, and is refused when it names no Place or several, or an outline the seed does not hold. It holds:
  - 버들골 풍산마당 (100동), 데이터사이언스대학원 (43-2동) and 종합운동장본부석 (149동), each with one outline of OpenStreetMap; 화학관연결동 (253동) with none; 반도체교육관 (104-1동) with its own polygon alone;
  - 대학원연구동(2단계) (500동) with the four polygons labelled `501동` to `504동`, which the campus map counts as parts of 500동;
  - 종합운동장 with OpenStreetMap's `대운동장`, 야구장, 관악사운동장 and 자하연 with one outline each, 테니스장 with five and 공대테니스장 with two.
- [x] The OpenStreetMap outline seed holds only the outlines that file names, exported by their identifiers.
- [x] `national-map-places.json` adds the Places that the campus map's list lacks, each by one polygon of the layer, with its name and, where one is known, its number: 해동첨단공학관 (303동), 삼성전자서울대연구소 (944동), 디자인연구동 (49-1동) and 배터리공동연구센터. Such a Place's origin is the national map, its identifier there the polygon's, and its position the centre of the polygon's bounding box.
- [x] A Place stores its outlines as a list of closed rings in ordinary columns, with one migration from the schema of `1.0/Main`. No spatial type is used.
- [x] The Place at a position: a Place is as far as its nearest outline, and at no distance when any of its outlines holds the position. `inside` within 5 m, `near` up to 20 m, the nearer wall between two Places, and the nearer position among the Places of one outline stay as they are.
- [x] Tests of the seed command against the real database: a Place linked by its label, by a wing's label, by its position, and within 10 m beside a polygon another Place has; a Place with several outlines; a wall-less polygon that is no Place's outline; entries of `place-outlines.json` that give an OpenStreetMap outline, several outlines, an outline to a Place named by its name, and none; an entry naming an unknown outline or Place refused; a Place added from the layer.
- [x] Tests of the Place at a position on the started server, with positions and distances worked out apart from the server's code: the cases of ticket 03 against the new outlines, a position inside the second outline of a Place, a position on the field of 종합운동장, and one in its stand, which is 종합운동장본부석.
- [x] The main server's README says where the layer is downloaded, which of its files holds the campus and how the export tells when it does not, how the exports and `place-outlines.json` work, and both licences. The specs that name the list say Place.
- [x] The ticket records how many of the Places have an outline after the change, and which do not.

## Comments

### Decisions made while implementing (2026-10-03)

The main server's README says, under Places and Seed data, how the outlines are exported, loaded and given by hand. The facts of the data are here and in the seed files.

- **The entries are Places everywhere**: the table `places` with the enum `place_origin`, `src/places/` with `PlacesModule`, `PlacesService`, `PlaceDto` and `PlaceLookup`, whose answer is `{ place, relation }`, the routes `GET /places` and `GET /places/search`, and the seed files `campus-map-places.json`, `openstreetmap-places.json`, `national-map-outlines.geojson`, `openstreetmap-outlines.geojson` and `place-outlines.json`. The exports bear the names of their files. `GLOSSARY.md` defines Place, and the specs that named the building list name the list of Places.
  - One migration from the schema of `1.0/Main`, `20261003070000_places_with_outlines`: it renames the table `buildings` and the enum `building_origin`, adds the origin `national_map`, drops `outline` and adds `outlines`, `JSONB NOT NULL DEFAULT '[]'`, empty for a Place without an outline. A database that ran `add_buildings` migrates in place and keeps its rows, and the next loading of the seed fills the column.
  - For tickets 02 and 04, whose branches stand on ticket 03's: `BuildingsModule`, `BuildingsService`, `BuildingDto` and `BuildingLookup` are now the names above, and `prisma.building` is `prisma.place`. Ticket 02's event has a place, the text of a post, beside the Place that text names; that ticket chooses what to call the text.
- **The layer's seed file is `seed/national-map-outlines.geojson`**, a GeoJSON FeatureCollection as OpenStreetMap's is, so that GitHub draws it. A feature's `id` is the layer's `UFID`, `properties.label` its `ANNO`, or `null` where the layer writes none. The top of the file keeps `exportedFrom`, the download page, `file`, the name of the downloaded file, `exportedOn` and `attribution`.
  - The notice names 국토지리정보원, the layer, VWorld and 공공누리 type 1. It gives no year: neither the download page nor the file states one.
- **`pnpm seed:export national-map-outlines <path>`**: the path follows the name. The other exports take no path, and several names in one command still work.
- **A polygon reaches the campus extent when one of its points lies in it**, in longitude and latitude. On this file that gives the same 356 polygons as a true intersection with the extent.
- **A courtyard is left out**, as ticket 03 decided for OpenStreetMap: six of the 356 have inner rings, those of 38동, 39동, 61동, 70동, 71동 and 82동. Every record of the file is one polygon; a record of several would stop the export.
- **The attribute table is read as EUC-KR.** No `.cpg` names the encoding. The table's language byte is `0x4E`, Korean in code page 949, which the `euc-kr` decoder reads, and every value of the 2.2 million records that is not ASCII decodes as CP949; 84 of them also decode as UTF-8, by chance. The labels of the 356 polygons are the same by both reads.
- **`BDK004` alone is kept**, as the criterion says. The whole file has eight kinds, `BDK001` to `BDK008`; the campus extent has none of `BDK001` to `BDK003`.
- **Dev dependencies, for the export alone**: `shapefile` reads the `.shp` and the `.dbf`, `proj4` converts the coordinates, and `yauzl` reads the two files out of the ZIP as streams, so nothing is unzipped to disk. `@types/shapefile` and `@types/yauzl` come with them. Nothing was added to what the server needs to run.
- **The layer is read in `scripts/national-map.ts`**, beside `scripts/export-seed.ts`, which would otherwise pass oxlint's 300 lines. A script imports another by its `.ts` name, as Node runs it, which TypeScript accepts with `rewriteRelativeImportExtensions` in `tsconfig.json`. The build covers `src/` alone and is not changed by it. The file exports `toLongitudeLatitude()`, the conversion of one point, for the test.
- **The export of the layer takes about 80 seconds**: it reads all 2.2 million records in the order of the file, since a ZIP's member cannot be read from the middle.
- **The export gives Node five seconds to connect.** Node tries each address of a host for 250 ms before the next, and Overpass takes about a second to answer from Korea: every request of the export timed out, while `curl` got through.
- **The rules hold for every Place.** No rule asks whether a Place has a number; a label can only name one that has. For the eight Places of the campus map without a number this changes nothing today: none lies inside a polygon of the layer, and the nearest polygon is 16 m away.
- **A letter after the number is a wing**: `919-A동` names 919동. The layer writes two such labels on the campus, `919-A동` to `919-C동` and `946-A동`.
- **Within 10 m, the nearest polygon that no Place has.** The pairs of a Place still without an outline and a polygon that no Place has by the first two rules are taken nearest first, each Place and each polygon once. It links 7. Taking only a Place's nearest polygon, and nothing when another Place has it, linked 5: it left out 인문관연결동 (250동), 1.1 m from the polygon of 인문관2 and as near to a polygon of 70 m² without a label that lies between 인문관1 and 인문관2, and 다목적차량보관소 (332동), 2.8 m from the polygon of 330동 and 5.4 m from one of 134 m² on which Kakao's map writes 다목적차량보관소(332).
- **`place-outlines.json`** holds its entries under `places`, each with `number` or `name`, with `outlines` and with `why`; another key is refused. A name is looked up among all Places, so a name that several bear is refused. An entry's outlines replace all that the rules gave, in the order of the file, and an empty list takes them away. An identifier is looked up in both outline files: a `UFID` of the national map or OpenStreetMap's `way/…`.
- **The OpenStreetMap export reads `place-outlines.json`** and asks Overpass for the outlines it names, by their identifiers. It refuses an answer that lacks one. Relations are still read, though the fourteen outlines are ways.
- **종합운동장 has OpenStreetMap's `대운동장`**, the ground with its track and stands, and not the soccer pitch alone. It overlaps the outline of 종합운동장본부석 (149동): a position in the stand is in both, and the lookup answers the earlier of the list, 149동, since Places with a number come first. 테니스장 has all five groups of courts and 공대테니스장 both. OpenStreetMap draws no area for 붉은광장, and the main gate needs none.
- **`national-map-places.json`** holds its entries under `places`, each with the polygon's identifier as `outline`, with `number`, which may be `null`, with `name` and with `why`. Such a Place's origin is `national_map` and its identifier there the polygon's, so that its id follows the rule of the others (`docs/adr/0002-place-ids-computed-from-the-source.md`). Its position is the middle of the polygon's bounding box, which is also what Overpass gives for a Place of OpenStreetMap. The rules then link it as any other: 944동 and 49-1동 by their labels, 해동첨단공학관 and 배터리공동연구센터 by their position.
  - 해동첨단공학관 is 303동 by the campus map's amenities, which name `공과대학 해동첨단공학관(303동)`, a bicycle rack, and `해동첨단공학센터 303동`, two defibrillators. Its list of buildings, `/api/building.action`, has no such row.
  - 배터리공동연구센터 is the polygon the layer labels `311관`. No source at hand gives it a number.
- **The lookup measures each Place to the nearest of its outlines** and remembers which outline that was. Two Places at the same distance share an outline when that outline is the same ring, and then the nearer position wins, as before. Where two outlines hold the position, both Places are at no distance and the earlier of the list stays.
- **The seed's tests are three files**, each under oxlint's 300 lines: `test/seed.e2e-spec.ts` for the list, `test/seed-outlines.e2e-spec.ts` for the rules and `test/seed-place-outlines.e2e-spec.ts` for the two files written by hand. Each makes its database with `createDatabase()` in `test/containers.ts`, and `test/seed-outlines.ts` reads the seed's outlines for the last two.

### The numbers (2026-10-03)

- The seed holds 356 polygons of the national map with 6,029 points, 233 of them with a label, and 14 outlines of OpenStreetMap.
- 230 Places are loaded: 224 of the campus map, 2 of OpenStreetMap and 4 of the national map. 221 have a number and 9 have none.
- **216 have an outline**: 175 by a label, 23 by their position, 7 within 10 m (104-2, 128, 207, 250, 251, 332 and 506) and 11 by `place-outlines.json`.
  - Of the 221 with a number, 209 have one; of the 9 without, 7.
- **14 have none**:
  - 김철수물리관 (56-1동) and 정문수위실 (115동);
  - three links between buildings: 화학관연결동 (253동), 물리관연결동 (254동) and 예능관연결동 (255동);
  - seven stores and small buildings: 야외조각실습장2 (52-2동), 영선공장 (68-2동), 폐기물창고 (98-2동), 정구장관리실 (99-1동), 반도체연구소수소창고 (104-3동), 간이식당1 (110동) and 양수장 (117동);
  - 붉은광장 and 서울대 정문, which have no number.
- Thirteen Places have several outlines: 16동 and 테니스장 five, 500동 four, 42동 and 919동 three, and 50, 59, 66, 72, 73, 105, 901 and 공대테니스장 two each. The Places have 239 outlines in all.
- Seven polygons are the outline of two Places each: 10 and 252, 52 and 52-1, 59 and 59-1, 105 and 105-1, 105 and 105-2, 140 and 140-1, and 901 and 906.
- Of the seed's 370 outlines, 138 are no Place's, most of them small structures. Of the large ones, 915동 to 917동, the faculty housing and 서울교육청과학전시관 stand outside the Campus Boundary. Four polygons without a label inside it, of 887 to 1,909 m², are no Place's either: `B0010000000RF2FYX` beside 500동, `B0010000000RF23L8` beside 924동, `B0010000000SIX6E3` beside 45동 and `B0010000000RF26J9` beside 62-1동.
- No Place's position lies in two of the 356 polygons, so "the larger when two do" decides nothing on today's data. Its test adds two polygons to a copy of the seed.
- **One label of the layer is wrong, and `place-outlines.json` sets it right.** The polygon `B0010000000RF2EB9` is labelled `104-1동국제대학원` and stands at 국제대학원, 1,044 m from 반도체교육관 (104-1동). By its label it would be a second outline of 104-1동; the file leaves 104-1동 its own polygon, `B0010000000RF2ENL`, alone. By position the polygon is the outline of 국제회의동 (140-2동), which keeps it.
- The conversion was compared with PROJ for every point of the seed: the largest difference is 5 × 10⁻⁸ degrees, the rounding to seven decimals.

### Tests (2026-10-03)

- The rules, on a database of its own: `test/seed-outlines.e2e-spec.ts` (12).
  - `toLongitudeLatitude()` gives, for the first point of 151동미술관 in the layer's coordinates, the longitude and latitude that PROJ gives.
  - By a label: 제1공학관; 사회과학관 with five outlines and 문화관 with two; `1동` not read out of `101동`, nor `25동` out of `25-1동`; 919동 with the three polygons of its wings.
  - Without a label: 우석경제관 by its position, and 59-1동 inside a polygon of 59동; 506동, 250동 and 332동 within 10 m, the last two beside a polygon another Place has; of 104-2동 and 104-3동 the nearer; 물리관연결동, which the layer draws as a wall-less structure, without an outline; 붉은광장, 16 m from the nearest polygon, without one.
  - Against polygons added to a copy of the seed: the larger of two that hold a position; 붉은광장 linked by its position to a square around it, as a Place with a number would be.
- The two files written by hand, on a database of its own: `test/seed-place-outlines.e2e-spec.ts` (9).
  - `place-outlines.json`, each against a copy of the seed with an empty file: OpenStreetMap's outline for 100동 and none for 253동; 104-1동 with two outlines without the file and its own alone with it; 500동 with one and with four, in the file's order; 종합운동장 named by its name, and 테니스장 with five; an unknown outline refused; an unknown number, an unknown name and a name that seven Places bear refused.
  - `national-map-places.json`: 해동첨단공학관 with its origin, the polygon's identifier, the position worked out apart from the code and the polygon as its outline; 배터리공동연구센터 without a number; an unknown polygon refused.
- The Place at a position, on the started server: `test/place-lookup.e2e-spec.ts` (11). The cases of ticket 03 against the new outlines: inside 제1공학관; 3 m and 12 m west of its longest wall; 83 m from everything; 붉은광장 and 김철수물리관, which have no outline; inside 교직원아파트 4.5 m from 가족생활관4; between the two; and 국제대학원, 국제대학원2 and 국제회의동 each at its own position. Also: inside each of 문화관's two outlines and the last of 사회과학관's five; the middle of the field of 종합운동장 and of courts 7 and 8 of 테니스장, each `inside`; and the stand, which is 종합운동장본부석.
  - The positions and the expected answers were worked out apart from the server's code, from the seed files: with shapely in EPSG:5186 and PROJ for the cases of ticket 03, and with a ray-casting test and distances in a local plane for the new ones.
  - The position 30 m west of 제1공학관, far from everything before, is 6.6 m from 해동첨단공학관 now, so the case of no Place moved to a slope 83 m from the nearest outline and position.
- `test/seed.e2e-spec.ts` (5) and `test/places.e2e-spec.ts` (8) keep the tests of the list and of the two routes, with 230 Places, nine of them without a number.
- Seen to fail first:
  - The tests of the wing, of the new file's shape, of the Places by name and of the Places from the layer were written before the code. The first failed alone; the others stopped the whole run, since the seed that every test loads was already in the new shape.
  - Each new rule was then broken by hand and a test seen to fail: a reach of 1 m, a polygon given to two Places within 10 m, a polygon of another Place taken within 10 m, the rules for Places with a number only, only the first outline of an entry, an empty list ignored, a name matched as a number, a name of several Places accepted, an added Place at the first point of its polygon, and a scale factor of 1 in the conversion. The test of 붉은광장's square passed at first with the rules for numbered Places only, since the 10 m rule reached the square's wall: the square is now about 60 m a side.
  - The lookup's code did not change. Its new cases passed when first run, as the stand's does by the order of the list.

### The exports (2026-10-03)

- The national map, with the committed command, from the downloaded ZIP of file 001, `(연속수치지형도)건물_001.zip`: 356 polygons in 83 seconds.
  - From the unzipped `N3A_B0010000_001.shp` the same features came out; only `file` differed.
  - Refused: the unzipped file 009, after reading all of it, with `holds no building in the campus extent: the campus is in another of the layer's files`; the `.shp` of GIS건물통합정보 and a ZIP of another dataset, as not the layer; a file that is no ZIP and an incomplete ZIP, with yauzl's message that the file is no ZIP or is truncated.
- OpenStreetMap's fourteen outlines, with the committed command over the network: `pnpm seed:export openstreetmap-outlines` asked Overpass for the identifiers that `place-outlines.json` names and wrote the file. The three outlines the file held before are unchanged.

### Checks and the real start (2026-10-03)

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm build` pass. `pnpm test`: 27 files and 301 tests pass.
- One start, `docker compose -p p07-06-places-check up --build -d postgres redis main-server` from the repository root, under a project name of its own so that the developer database was not touched:
  - The image built, applied the four migrations, logged `Loaded 230 places` and started. Readiness and liveness answered 200, `GET /places` and `GET /places/search?q=302` without a token 401, and `GET /buildings` 404.
  - `prisma migrate diff` from that database to the schema found no difference. The table `buildings` was gone, and the enum held `campus_map`, `openstreetmap` and `national_map`.
  - The table held 230 rows: 216 with outlines, 239 outlines in all, 13 Places with several; 종합운동장 with one, 테니스장 with five, 500동 with four, 919동 with three, 250동, 332동 and 해동첨단공학관 with one, 253동 and 붉은광장 with none.
  - A restart of the main server found no pending migration, loaded the seed again, and left 230 rows, 제2공학관 under the id it had.
  - `docker compose -p p07-06-places-check down -v --rmi local` removed the run's containers, volume and images.

### Not verified (2026-10-03)

- The links were not looked at one by one against a map. Those that the wing's label and the 10 m rule changed, of 919동, 250동 and 332동, and the outlines of the fields, the courts and 500동 were looked at over Kakao's map and skyview; the pull request links the page that draws every outline there.
- The links by a label and by position were compared with a calculation apart from the server's code, with shapely in EPSG:5186, before the wing was read, before the 10 m rule changed and before the Places of the national map were added. The Places that those changed were not compared in that way.
- What the four large polygons without a label and without a Place are (The numbers).
- 배터리공동연구센터 has no number in any source at hand, and its name is the one that Kakao's map writes at the polygon. The other three added Places are named after the layer's labels.

### Agent usage (2026-10-03)

One session, the one that reviewed ticket 03's pull request, and two agents it started. Counted from where ticket 03's last usage section ends: the questions about the outlines' source, the research, the comparisons on the map, the person's check, this ticket, and its build.

- Agent time: about 3 hours, an estimate.
  - The session's own steps took about 112 minutes: the gaps under five minutes between them, which also count short pauses between questions.
  - The research agent worked about 24 minutes and the implementing agent about 42, each while the session waited.
- Tokens, the two agents included, counted when this section was written:
  - Input: 138,096,830 in total, of which 136,978,775 were cache reads, 1,117,279 cache writes and 776 uncached. The two agents took 43,857,872 of it.
  - Output: 295,382. The agents' transcripts record only part of their output, so this is a lower bound.
