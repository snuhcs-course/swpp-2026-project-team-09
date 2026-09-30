# 04: Shuttle route line and stops

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Menus: receive, store and serve), 03 (Buildings and Campus Boundary from OpenStreetMap)

## What to build

The main server holds the circular shuttle route 41946 as a line along the real roads and its stops with coordinates, both from OpenStreetMap as seed data, and receives the operator's stop list from the worker once a day: the stop names in loop order, each stop's position on the operator's drawing, and the service hours. A User's app gets the stops in loop order and the route line to draw, so that a User knows where to wait. Ticket 05 places the vehicles on this line. The worker side is ticket 10.

## Acceptance criteria

- [ ] The route line of 41946 is exported once from OpenStreetMap as one line that follows the roads around the loop, and the 14 stops with their coordinates, matched by name to the operator's stop names. The export follows the method of ticket 03, and the name matching is part of the seed data. Where OpenStreetMap lacks a stop or a stretch of road, the gap is recorded under `## Comments` in this ticket; P20 rides the loop to confirm the line.
- [ ] The line and the stops are stored as spatial data, and the server knows where along the line each stop lies, in loop order, so that ticket 05 can place a vehicle between two stops.
- [ ] The main server handles a request-and-response message that carries the operator's stop list: the stop names in loop order with their positions on the drawing, and the service hours as text. It follows the conventions of ticket 01. Each stop is stored once, and the same message twice changes nothing.
- [ ] A message whose stop names do not match the stored stops is refused and recorded as a failed collection, because it means the operator's page changed.
- [ ] A User's route returns the stops in loop order with their names and coordinates, the route line as a list of coordinates, and the service hours text. It needs a User's access token.
- [ ] The spatial SQL is raw SQL kept in one module with a small interface. No other code contains spatial SQL.
- [ ] The README records the message's shape and where the route data comes from.
- [ ] Tests: the seeded stops and line are served in loop order; a stop-list message is stored once; a message with an unknown stop name is refused and the failure is recorded; against the real database, every stop's coordinates lie within a few metres of the line.
