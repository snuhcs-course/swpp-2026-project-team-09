# P15: Connect dining and shuttle views

Status: ready-for-agent

## Problem Statement

The main server holds menus and shuttle positions, but a User cannot see them. To decide where to eat or whether to wait for the shuttle, the User still opens other sites.

## Solution

A dining view that shows menus by day, meal and restaurant, and a shuttle view that shows the stops and the vehicles moving along the route on the map.

## User Stories

### Dining

1. As an SNU student, I want today's menus when I open the dining view, so that I see what matters now.
2. As an SNU student, I want the view to open on the meal that is served next, so that I do not switch tabs at lunchtime.
3. As an SNU student, I want to switch between breakfast, lunch and dinner, so that I can plan the day.
4. As an SNU student, I want to move to the following days, so that I can plan the week.
5. As an SNU student, I want menus grouped by restaurant, so that I can compare places.
6. As an SNU student, I want the price next to each menu, so that I can compare cost.
7. As an SNU student, I want a menu without a price shown without one, so that no invented price appears.
8. As an SNU student, I want each meal's operating hours and notices as the restaurant posted them, so that I do not arrive at a closed door.
9. As an SNU student, I want a restaurant with no menu for that meal marked as not serving, so that I can tell it from a loading error.
10. As an SNU student, I want to see when the menus were last collected, so that I know how fresh they are.
11. As an SNU student, I want a clear message when menus cannot be loaded, so that I know to try again.

### Shuttle

12. As an SNU student, I want the shuttle stops as markers on the map, so that I know where to wait.
13. As an SNU student, I want the route drawn as a line, so that I see where the shuttle goes.
14. As an SNU student, I want each vehicle shown at the stop it was last reported at and moving smoothly to the next along the route, so that I can tell how far the next one is.
15. As an SNU student, I want to tap a stop and see its name, so that I know which stop it is.
16. As an SNU student, I want to be told when the shuttle is not in service, with its service hours, so that I do not wait for nothing.
17. As an SNU student, I want vehicles to keep moving while I watch, without refreshing, so that the view is live.
18. As an SNU student, I want to turn the shuttle layer off, so that the map is not crowded when I do not need it.

### Attribution

19. As an SNU student, I want to find the sources of the map data on an information screen, so that the project credits them properly.

## Implementation Decisions

- This task builds screens and connects them to the API of P07. It adds no server behaviour.
- The dining view opens as a panel over the map. It shows 7 days starting today.
- A meal is shown as its lines, in the page's order (P07, ADR 0001). A dish that has a name and a price is a row with both. A heading is a section title, with its set price when it has one. A note, such as operating hours or a closure, is in smaller text. Any other line is shown as it was written. The app does not group by corner or compute a cheapest dish.
- The meal served next is chosen by the time of day.
- The shuttle is a layer of the map, not a separate map. Stops, the route line and vehicles use the map component of P06.
- Vehicle positions arrive over the socket connection, each vehicle with its stop, the stop's coordinates and the time the position was received. The app fetches the current positions once when the layer is turned on.
- The operator reports a vehicle only at a stop. The app moves it from its last stop to the new one along the route line.
- A vehicle whose position is older than a minute is removed, so that vehicles do not stay on the map when the service ends or no further message arrives.
- Vehicles carry no label saying that their position is estimated.
- Outside weekdays from 08:00 to 21:00 the layer shows the stops and the route with a notice that the shuttle is not in service.
- The information screen shows the OpenStreetMap attribution with a link to its copyright page.
- What the shuttle feed reports, its service hours, the menu pages' quirks and OpenStreetMap's attribution rules are in `.scratch/research/external-sources.md`.
- The arrangement is provisional. P19 adapts it to the wireframes.

## Testing Decisions

- A good test drives a screen as a User would and checks what is shown.
- Screens are tested with Jest against a fake API and a fake socket.
- Covered behaviour: the meal chosen by time of day; switching meals and days; a menu without a price; a restaurant not serving; the message when loading fails; the shuttle notice outside service hours; vehicles appearing and moving as messages arrive; a vehicle removed after a minute without a new position.
- The look of the route and the vehicles on the map is checked by hand on a phone.
- Prior art: the screen tests of P06 and P13.

## Out of Scope

- Study spaces and library seats.
- Shuttle routes other than the circular route 41946.
- Arrival time estimates at a stop.
- Recommendations of where to eat.
- A chat assistant.

## Further Notes

- The schedule names 함재현 as the worker.
- This task depends on the map of P06 and on the API of P07.
- P05 saw the operator report vehicles at stops only, each moving on by one stop every 45 to 90 seconds. `.scratch/research/external-sources.md` §5 has the observations.
