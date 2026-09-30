# 10: Collect the shuttle stops from the operator's route page

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Shuttle route line and stops), 07 (Collect the veterinary college menus on a schedule)

## What to build

Once a day the worker reads the operator's route page for the circular route 41946: the stops in loop order, each stop's position on the operator's drawing, and the service hours in the page header. It sends them to the main server as the message of ticket 04, so that the main server can turn the operator's vehicle positions into points on the real route and tell the app the service hours. The page's layout is recorded in `.scratch/research/external-sources.md`.

## Acceptance criteria

- [ ] Once a day the collector fetches the route page for 41946 through the fetch boundary of ticket 07.
- [ ] The parser reads every stop in the order the page lists them, with its name and its position on the drawing, and the service hours text from the page header.
- [ ] The collector sends the stop-list message of ticket 04 and waits for the answer. A refused message, which the main server gives when the names no longer match the stored stops, is treated as a failed run.
- [ ] A page from which no stops can be read, or fewer than the route has, is treated as a failed run and reported as in ticket 07.
- [ ] The saved page is a fixture in the repository. A test feeds it to the parser and checks the 14 stops in loop order with the positions recorded in the research document, and the service hours. Another test checks the message sent for a run.
