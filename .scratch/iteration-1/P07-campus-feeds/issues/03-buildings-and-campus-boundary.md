# 03: Buildings and the Campus Boundary from OpenStreetMap

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server holds the campus buildings and the Campus Boundary, both from OpenStreetMap, loaded once as seed data. A User's app lists the buildings with their names, coordinates and, where the name carries one, their numbers, and searches them by name or number, so that a User picks a place without typing coordinates (P06, P08). The Campus Boundary is one polygon that P08 reads in server code to decide whether a position is on campus.

This ticket also sets up what ticket 04 reuses: the one module that holds the spatial SQL, the way a seed file is exported from OpenStreetMap and loaded into the database, and how the tests get the seed.

## Acceptance criteria

- [ ] Each seed file is exported with one Overpass query over the campus extent. The query is kept beside the file with the date of the export, so that the export can be repeated, and it names the project in its User-Agent, as OpenStreetMap asks.
- [ ] The building seed holds every building in the campus extent that has a name: the name, one point of coordinates, and the number where the name carries one, such as `27동`, `25-1동` or `학생회관(63)`. A building without a number in its name has none; filling those in from the university's building list is follow-up work on the seed file, not this ticket.
- [ ] The Campus Boundary seed is OpenStreetMap relation 11917142 as one polygon.
- [ ] Buildings and the Campus Boundary are stored as PostGIS spatial data. All spatial SQL lives in one module with a small interface, store a shape and read it back as coordinates, and no other code contains spatial SQL.
- [ ] One command loads the seed into any database and is repeatable: running it twice leaves one set of records, and a corrected seed file replaces the earlier rows. The one command that starts the system loads the seed, and the tests have it.
- [ ] A User's route lists the buildings with name, number and coordinates, and a search route finds buildings by a part of the name or by the number. Both need a User's access token.
- [ ] Another feature of the main server can read the Campus Boundary as a polygon in memory, once, so that P08 checks positions without a database query.
- [ ] Tests against the real database with PostGIS: the seed loads, and loads again without duplicates; a building and the Boundary are stored and read back with their coordinates; the list and the search answer, and a request without a User's access token is refused.
- [ ] The main server's README records how a seed is exported and loaded, and that the app shows OpenStreetMap's attribution (P15).
