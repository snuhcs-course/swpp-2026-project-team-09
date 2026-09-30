# 05: Shuttle vehicles on the route

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Shuttle route line and stops)

## What to build

During service hours the worker sends, every 15 seconds, the vehicles the operator reports, each as a position on the operator's drawing rather than as coordinates. The main server turns each position into a point on the real route line: it finds the stop the position is at, or the two stops it lies between and the fraction of that segment, and asks PostGIS for the point at that fraction of the line. Only each vehicle's latest position is kept. A User's app fetches the current vehicles once when it opens the map, and after that receives each new set of positions pushed through the socket server with their coordinates. Outside service hours, or when the operator reports no vehicle, the app is told that the shuttle is not in service.

P05 observed the operator's positions during service: every position fell exactly on a stop, so the fraction is 0 in practice, and the app interpolates between reports (P15). The computation still handles a position between two stops, because the drawing allows one. The worker side is ticket 11.

## Acceptance criteria

- [ ] The main server handles a request-and-response message that carries the vehicles of one report: the operator's vehicle identifier and the position on the drawing for each, and the time the report was received. It follows the conventions of ticket 01. A message may carry a vehicle's coordinates instead; when it does, they are stored in place of the computed point, so that coordinates from the operator replace the computation without a change of shape.
- [ ] A vehicle's drawing position is turned into the stop it is at, or the two stops it lies between and the fraction of that segment, and then into the point at that fraction of the route line between those stops. The loop's closing segment, from the last stop back to the first, works like any other.
- [ ] All spatial SQL for this is raw SQL in the one spatial module of ticket 04, behind a small interface. No other code contains spatial SQL.
- [ ] Only the latest position of each vehicle is kept. A vehicle absent from a report is no longer served.
- [ ] A User's route returns the current vehicles with their identifiers and coordinates and the time of the report. Outside weekdays between 08:00 and 21:00 Asia/Seoul, or when the last report held no vehicle, it says the shuttle is not in service and returns no vehicles. It needs a User's access token.
- [ ] After each stored report, the main server emits an event carrying the vehicles' coordinates, and the socket server forwards it to every connected app. The event's name and shape are recorded in the README for P15.
- [ ] No response carries any label saying that a position is estimated.
- [ ] Tests against the real database with PostGIS: a vehicle at a stop lands on that stop's coordinates; a vehicle between two stops lands on the line between them; a vehicle on the closing segment of the loop lands on the road back to the first stop; a second report keeps only the latest position and drops an absent vehicle; the route reports not in service outside the hours; a report emits the event, seen by a test listener on the test Redis; the socket server forwards it to a connected client.
