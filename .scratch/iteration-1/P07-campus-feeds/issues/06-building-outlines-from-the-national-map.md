# 06: Building outlines from the national map

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A building's outlines come from the 국토지리정보원's 연속수치지형도 건물 layer instead of OpenStreetMap, and a building may have several outlines. On this campus the layer draws more of the buildings, its outlines lie closer to the buildings as Kakao's map draws them, and its labels carry the building numbers, so that an outline is linked to a building by its number rather than by where a point happens to lie. `.scratch/research/public-building-outlines.md` §9 has the comparison, a person's check of every large difference, and the decisions this ticket carries out.

The layer is downloaded by a person from VWorld, behind a login, and stays outside the repository. The export command reads the downloaded file and writes a seed file with the campus's buildings. OpenStreetMap's outlines remain for the three buildings the corrections file names. The building list, the Campus Boundary, the routes and the rules of the building at a position (ticket 03) stay as they are; that lookup answers from all of a building's outlines.

## Acceptance criteria

- [ ] `pnpm seed:export` has an export that takes the path of the downloaded layer file, the ZIP or its unzipped `.shp`, and writes a seed file of the polygons that reach the campus extent and that the layer classes as buildings (`KIND` `BDK004`). Wall-less structures, temporary buildings and greenhouses are left out. Each polygon keeps the layer's identifier (`UFID`) and its label (`ANNO`), with its coordinates converted from EPSG:5179 to longitude and latitude, so that the server converts nothing.
- [ ] The seed file keeps the page it was downloaded from, the name of the downloaded file, the day of the export and the notice its licence asks for: the source, 국토지리정보원, under 공공누리 type 1. It is formatted by Prettier like the other seed files. The downloaded file itself is not in the repository.
- [ ] The export refuses a file that is not this layer, and a file that holds no building in the campus extent, saying that the campus is in another of the layer's files.
- [ ] The conversion of coordinates is checked against a pair of coordinates known apart from the code.
- [ ] A building is linked to its outlines in this order, and a place has none:
  1. every polygon whose label names the building's number as `<number>동`, the whole number: `1동` is not in `101동`, and `25동` is not in `25-1동`;
  2. without such a label, the polygon that holds the building's position, the larger when two do, also when another building has it;
  3. without that, a polygon within 10 m that no building has, the nearest building first.
- [ ] The corrections file gives a building an outline of either source, or none, each with its reason, and still refuses a building or an outline the seed does not hold. It holds four corrections: 버들골 풍산마당 (100동) and 데이터사이언스대학원 (43-2동) take OpenStreetMap's outlines `way/193893586` and `way/1485386282`; 종합운동장본부석 (149동) takes the OpenStreetMap outline it has today; 화학관연결동 (253동) has none.
- [ ] The OpenStreetMap outline seed holds only the outlines the corrections name, exported by their identifiers.
- [ ] A building stores its outlines as a list of closed rings in ordinary columns, with one migration from the schema of `1.0/Main`. No spatial type is used.
- [ ] The building at a position: a building is as far as its nearest outline, and at no distance when any of its outlines holds the position. `inside` within 5 m, `near` up to 20 m, the nearer wall between two buildings, and the nearer position among the buildings of one outline stay as they are.
- [ ] Tests of the seed command against the real database: a building linked by its label; a building with several outlines, 사회과학관 (16동) with five and 문화관 (73동) with two; a building without a label linked by its position; one linked within 10 m; a wall-less polygon that is no building's outline; a correction that gives an OpenStreetMap outline and one that takes an outline away; a correction naming an unknown outline refused.
- [ ] Tests of the building at a position on the started server, with positions and distances worked out apart from the server's code: the cases of ticket 03 against the new outlines, and a position inside the second outline of a building, which is inside that building.
- [ ] The main server's README says where the layer is downloaded, which of its files holds the campus and how the export tells when it does not, how the export and the corrections work, and both licences. The P07 spec's Buildings section and the P15 spec's information screen name both sources.
- [ ] The ticket records how many of the numbered buildings have an outline after the change, and which do not.

## Comments
