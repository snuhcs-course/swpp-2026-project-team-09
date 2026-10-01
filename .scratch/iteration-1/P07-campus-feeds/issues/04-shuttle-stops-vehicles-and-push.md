# 04: Shuttle: stops, vehicles and the push

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Menus: the first Collection, stored as lines), 03 (Buildings and the Campus Boundary from OpenStreetMap)

## What to build

A User's app draws the circular shuttle route 41946 with its stops and shows each vehicle at the stop the operator reports, moving on as the operator's next answer arrives. The route line and the stops' coordinates are seed data drawn from OpenStreetMap and matched by hand to the operator's 14 stops. Once a day the worker reads the operator's route page: the stops in loop order, each stop's position on the operator's drawing, and the service hours. On weekdays between 08:00 and 21:00 it asks the operator's position endpoint every 15 seconds and sends the vehicles it reports, each as a position on the drawing. The main server stores each vehicle as being at the nearest stop on the drawing, keeps only its latest position, serves the current vehicles, and hands each set of positions to the socket server, which sends it to every connected app with the stop and its coordinates. Outside service hours, or when the operator reports none, the app gets no vehicles, and the service hours to show.

Two steps are a person's: matching the operator's stops to OpenStreetMap's, and checking the route line on a map. The agent prepares both and records what the person decided under Comments.

## Acceptance criteria

- [ ] The stops seed holds the operator's 14 stops in loop order, each with its name as the operator writes it, its position on the operator's drawing as P05 recorded it, and the coordinates of the OpenStreetMap bus stop it was matched to. A person does the matching on the map; the agent proposes it from the names, and the choices are recorded under Comments (the operator's name, the OpenStreetMap node, why). `38동` has no OpenStreetMap stop of that name: the person settles its coordinates and records how.
- [ ] The route line seed follows OpenStreetMap's roads around the loop through the 14 stops. The agent produces a first line by following the roads between the matched stops; a person checks it on a map and corrects it before it is committed, and the corrections are recorded under Comments. P20 rides the loop to confirm it. The line and the stops are stored through ticket 03's spatial module and loaded by its seed command.
- [ ] Once a day the worker sends the operator's stop list from the route page: the names in loop order, each stop's position on the drawing, and the service hours as the page's text. The main server updates the drawing positions and the hours beside the seeded stops. A name the seed does not know is refused and recorded as a failure, because it means the page changed.
- [ ] On weekdays between 08:00 and 21:00 Asia/Seoul, every 15 seconds, the worker sends the operator's vehicles, each with its `carid` and its position on the drawing. Outside those hours it does not ask. An empty answer is sent as no vehicles.
- [ ] The main server stores a vehicle as being at the stop nearest to its drawing position, with the time the position was received, and keeps only the latest position of each vehicle. A position older than a minute is no longer served, so that the vehicles disappear on their own when the service ends or the worker stops.
- [ ] A User's route returns the stops in loop order with their coordinates, the route line and the service hours; another returns the current vehicles, each with its stop and the stop's coordinates. Both need a User's access token. No vehicle carries a label saying its position is estimated.
- [ ] Each set of positions the main server stores is sent to the socket server, which sends it to every connected app under one event, each vehicle with its stop and coordinates, whether or not the app shows the shuttle layer.
- [ ] Parser tests with saved pages and answers: the route page's stops and hours; vehicles at stops; several vehicles at one stop; an empty answer; a position that is not exactly on a stop, matched to the nearest.
- [ ] Message-boundary tests: stops stored and served in loop order; an unknown stop name refused and recorded; vehicles stored, served and replaced by a later message; a stale position no longer served; an empty message empties the list; invalid messages refused.
- [ ] A socket server test: a positions message from the main server reaches a connected client with each vehicle's stop and coordinates.
- [ ] The README of each server records its part: the seed and the matching, the messages, the routes, and the socket event with what it carries.
