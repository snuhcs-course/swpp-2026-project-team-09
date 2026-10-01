# 03: Buildings and the Campus Boundary

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server holds the campus buildings and places, loaded once as seed data from the university's campus map, and the Campus Boundary, one polygon from OpenStreetMap. A User's app lists the buildings with their numbers, names and coordinates and searches them by name or number, so that a User picks a place without typing coordinates (P06, P08). Ticket 02 matches the place of a collected event against the same list. The Campus Boundary is a file of the main server that P08 reads in server code to decide whether a position is on campus. Only what lies inside the Boundary is in the list.

This ticket also sets up what ticket 04 reuses: the way a seed file is exported, kept with its origin, and loaded into the database, and how the tests get the seed.

## Acceptance criteria

- [ ] The Campus Boundary seed is OpenStreetMap relation 11917142 as one polygon, exported with one Overpass query that names the project in its User-Agent, as OpenStreetMap asks. It is a file of the main server, read into memory once when the server starts, and is not stored in the database. Another feature of the main server can read it as a polygon, so that P08 checks positions without a database query.
- [ ] The building seed comes from the campus map's building list (`.scratch/research/external-sources.md` §6.2), fetched once: every entry inside the Campus Boundary, with its name, its coordinates and, where the map gives one, its building number. The entries without a number that are places, such as `종합운동장` and `자하연`, are kept; the map's `Test` entry is not. No coordinate is taken from Kakao, Naver or Google maps.
- [ ] The two buildings the map does not list, 71-1동 and 901동, are in the seed with OpenStreetMap's name and coordinates, marked as coming from OpenStreetMap.
- [ ] A name the map wraps, such as `관악 223동[우석경제관]`, is stored as `우석경제관`. Every other name is stored as its source writes it.
- [ ] Each seed file is kept beside the address or query it came from and the date of the export, so that the export can be repeated.
- [ ] Each entry keeps the identifier its source gives it: the campus map's own for its entries, OpenStreetMap's for the two added buildings. The entry's own identifier in the database never changes once it is loaded.
- [ ] One command loads the seed into any database and is repeatable: running it twice leaves one set of records, and a corrected seed file updates the entries it names in place, so that a timetable entry or a Meetup that points at a building still does. The one command that starts the system loads the seed, and the tests have it.
- [ ] Buildings are stored in ordinary columns, with a latitude and a longitude. No spatial type and no spatial SQL is used.
- [ ] A User's route lists the buildings with name, number and coordinates, and a search route finds buildings by a part of the name or by the number. Both need a User's access token.
- [ ] Tests against the real database: the seed loads, and loads again without duplicates; an entry whose name is corrected in the seed keeps its identifier; an entry outside the Campus Boundary is not loaded; the list and the search answer, and a request without a User's access token is refused. A test reads the Campus Boundary and finds a point inside it and one outside.
- [ ] The main server's README records how a seed is exported and loaded, where each seed comes from, and that the app shows OpenStreetMap's attribution (P15).
