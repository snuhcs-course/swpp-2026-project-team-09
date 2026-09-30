# 03: Buildings and Campus Boundary from OpenStreetMap

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server holds the list of campus buildings and the Campus Boundary, both from OpenStreetMap, loaded once as seed data. A User's app lists the buildings with their numbers, names and coordinates, and searches them by number or name, so that a User picks a place without typing coordinates. The Campus Boundary is one polygon, stored for P08 to read.

This ticket decides how seed data is exported from OpenStreetMap and loaded into the database. Ticket 04 loads the shuttle route the same way.

## Acceptance criteria

- [ ] The buildings inside the Campus Boundary (OpenStreetMap relation 11917142) are exported once from OpenStreetMap, each with its building number, its name and its coordinates. A building with neither a number nor a name is left out. The export is a data file in the repository, together with the date of the export, the query that produced it and the OpenStreetMap attribution and licence. The query is run by hand, once, within Overpass's usage rules; no server ever calls Overpass.
- [ ] The Campus Boundary is exported the same way as one polygon and stored as spatial data.
- [ ] Seed data is loaded by the same command that brings a database up to the current schema, so that a developer's database, Compose and the tests all have it. Loading it twice changes nothing.
- [ ] A User's route lists the buildings ordered by number, and the same route with a search text returns the buildings whose number starts with it or whose name contains it, case ignored. The route needs a User's access token.
- [ ] Other code can read the Campus Boundary through a small interface, so that P08 can check positions against it in server code. Spatial SQL stays in one module, as the spec asks.
- [ ] No coordinate is read from Kakao, Naver or Google maps. The README states where the data comes from, that it is under the ODbL, and the attribution text the app has to show.
- [ ] Tests through the API: the list holds the seeded buildings; a search by number and a search by name each find the right ones; and, against the real database, the stored polygon contains a point on campus and not a point off campus.
