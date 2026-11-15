# 16: Each Restaurant's own hours are data, so that a plan knows when a place closes

Parent: [P02 spec](../spec.md); the design's row 8, boards n10, n12, n13, n15 ("14:00까지", "19:00까지", "14:00 닫아요")
Status: needs-triage
Blocked by: nothing

## What to build

Each campus Restaurant keeps its opening hours for lunch and dinner on weekdays and weekends, taken from the co-op's published hours, not made up. A plan's candidate that the asker reaches after closing is dropped with "{HH:MM} 닫아요", and a card can say "{HH:MM}까지".

## Acceptance criteria

- [ ] The hours of each Restaurant the menus collect, from the published source named in the data, with the date read.
- [ ] A plan uses them in place of the fixed meal windows where a Restaurant has its own.
- [ ] Tests of a place that closes before arrival and of one with no hours known.

## Comments

- Needs triage: P01's spec lists "a Restaurant's own closing time" as out of scope, and the source and its upkeep need a decision. Until then n12 is not built and the "N시까지" words are left out (principle 1).
