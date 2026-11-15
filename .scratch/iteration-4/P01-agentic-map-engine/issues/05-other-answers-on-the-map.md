# 05: Other answers on the map

Parent: [P01 spec](../spec.md) ("The contract", "The Assistant")
Status: ready-for-agent
Blocked by: 03

## What to build

The Assistant's other answers that involve a Place (where a Place is, the minutes to a Place and whether the User will be late, and a Restaurant's menu) come back with a map scene in the answer's shape for an app with the `answer` capability, so that the answer screen draws them as it draws a Plan.

## Acceptance criteria

- [ ] The contract says how an answer without a Plan carries a map scene, on both sides.
- [ ] Each of the three answers returns its scene, computed by the server from the walking table and the User's day.
- [ ] An app without the capability is answered as before.
- [ ] Unit tests for each scene and integration tests at the Assistant's endpoint.

## Comments

### Triage (2026-11-15)

Split by wireframe row 7's boards into [06](06-a-lookup-and-where-a-place-is.md) (a Lookup, and where a Place is: q1), [07](07-minutes-and-lateness.md) (minutes and lateness: q2, q3, q15), [08](08-shuttle-or-walk.md) (shuttle or walk: q4), [09](09-a-menu-on-the-map.md) (a menu: q8), [10](10-where-a-friend-is.md) (where a Friend is: q5 to q7, after package C's Friend view), and [11](11-the-answer-screen-draws-a-lookup.md) (the app draws a Lookup, after package B's pull requests 245 and 246). This ticket is done when they are.

The first criterion's answer: an answer without a Plan is a **Lookup**, sent as the reply's `lookup` beside `answer` (ticket 06 gives the shape). The existing shape could not carry these boards as a Plan, since a Plan holds a recalculated input, people's parts, and the Sub Quests of the Quest it becomes.

Row 7's other boards are not in these tickets:

- q9 (a café on the way), q10 to q12 (the Tutorial Quests in order, a Tutorial question answered in words first, and the way there and back before a Class), and q14 (today's Classes): no ticket yet. The Tutorial needs data that does not exist (how long each Tutorial Quest takes) and the ordering tool of the freshman package (design section 6.5).
- q13 (Kwanjeong's free seats): package D's row 2.
- q16 (this week's performances): package C's row 4.
- q17 to q19 (Friends free for a meal, and grouping many results into circles): `findFreeFriends` exists. The circles are package B's (work split section 8).

### The rest of row 7 (2026-11-15)

Boards q9, q10 to q12, and q14 now have tickets: [12](12-todays-classes-on-the-map.md) (today's Classes, q14), [13](13-tutorial-quests-in-order.md) (the Tutorial Quests in order, q10), [14](14-tutorial-facts-then-the-way.md) (a Tutorial question, then the way there and back, q11 and q12; after package C's reply offers), and [15](15-a-cafe-on-the-way.md) (a café on the way, q9; waiting for café data).

