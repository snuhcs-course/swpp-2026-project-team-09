# 11: Collect the shuttle vehicle positions

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Shuttle vehicles on the route), 07 (Collect the veterinary college menus on a schedule)

## What to build

On weekdays between 08:00 and 21:00 the worker asks the operator's vehicle position endpoint every 15 seconds for the vehicles of the circular route 41946 and sends them to the main server as the message of ticket 05, so that a User sees the vehicles move along the route. Outside those hours it does not ask. An empty answer means no vehicle is running, and it is sent as such, so that the app can say the shuttle is not in service.

The spec's note that nobody had seen the endpoint return a vehicle is out of date: P05 observed six vehicles in service on 2026-09-30, and `.scratch/research/external-sources.md` records the request, the answer's format and what the positions mean. That observation is the basis of this parser.

## Acceptance criteria

- [ ] Every 15 seconds on weekdays between 08:00 and 21:00 Asia/Seoul the collector sends the operator's request for route 41946 through the fetch boundary of ticket 07. Outside those hours no request is made.
- [ ] The parser reads each row of the answer into a vehicle with the operator's vehicle identifier and its position on the drawing. Vehicles are told apart by the identifier only; the count and the plates in a row describe everything at that position and are not used to identify a vehicle.
- [ ] An empty answer is sent as a report with no vehicles, not as a failure.
- [ ] The time the answer was received is sent as the time of the report, because the answer carries none.
- [ ] A failed request or an unreadable answer is reported as in ticket 07 and does not stop the next run.
- [ ] Saved answers are fixtures in the repository: the answer observed on 2026-09-30 with six vehicles, four of them at one stop, and an empty answer. Tests feed them to the parser and check the vehicles, and one test checks the message sent for a run and one that no request is made outside the hours.
