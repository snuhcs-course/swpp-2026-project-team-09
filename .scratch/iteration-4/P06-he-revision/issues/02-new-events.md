# 02: New Events marked on the map until checked

Parent: [spec](../spec.md) ("Events on the map", "Global Events API", "Which event pins stay")
Status: ready-for-agent
Blocked by: 01 (Favorite Events, and the migration with `published_at`).
Prepared before the acceptance tests: yes. Done when the pull request into `4.0/Main` is open; whether it merges and ships before an acceptance test is decided by the team later.
Native files: no
PR assignee: Jaehyun0320

## What to build

An event published in the last 24 hours shows on the map with an exclamation mark until the User checks it. Checking is closing that event's card on the map (a single pin's card, or its row opened from a grouped pin's list) or starring it anywhere. Seeing it in the 행사 tab or in chat does not check it. A checked event leaves the map when its card closes, never while it is open, unless it is a Favorite Event or held today. Opening a grouped pin's card checks nothing; a checked event drops out of its group, the count goes down, and a group left with one event becomes that event's own pin. Pins that overlap at the current zoom merge, as study pins do, for every event pin. A grouped or merged pin shows one look, exclamation mark first, then star, then plain. Events an Administrator published, from a Draft or from the Same-event queue, count the same as collected ones.

## Acceptance criteria

- [ ] Every write that sets `state = published` records `publishedAt`. There are four: the rules that read a post and a Judgement (both when a session settles), an Administrator's publish of a Draft, and an Administrator's publish from the Same-event queue (same `administrator` route, easy to miss); events published before stay null and are never New Events; editing an event's time keeps it.
- [ ] The pin function from 01 adds the `new` look: `publishedAt` within 24 hours and not checked. The order is `new`, `favorite`, `plain`.
- [ ] Checked ids are kept on the phone per User; starring adds the id; an id is dropped once its event is more than 24 hours past `publishedAt`.
- [ ] A checked event leaves the map on card close, not before; a Favorite Event or today's event stays (as a star or plain pin).
- [ ] Grouping and the zoom merge show the strongest look and the total count.
- [ ] The exclamation look is a JS marker look; no native file changes.
- [ ] Tests (ADR 0007): main-server integration that each of the four writes sets `publishedAt` (the Same-event queue's publish included) and an edit keeps it; unit tests of the pin function at the 24-hour edge, checked and unchecked, and the look order, and of the merge; an app integration test that closing a New Event's card removes its pin and a starred one stays.
- [ ] The map files belong to package B (work split §4); B is told before the work starts.
- [ ] Wiki Requirements: US-EVENT-01, UI-02, UI-03, UI-05 changed, and a new story for Favorite Events. `GLOSSARY.md` gains **New Event** and **Favorite Event** (User-relative). Wiki Testing §6.3's P7, P8 and P9 become P06.
- [ ] The "Events on the map" row of `he-revision-log.md` gets this pull request and its state.

## Comments
