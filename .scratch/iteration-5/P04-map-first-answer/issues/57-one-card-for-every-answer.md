# 57: Every answer that docks is one card, which lowers into its dock with nothing swapped

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none. Follows ticket 54's follow-up (B).

Native files: none. Releases: an app OTA update only.

## What happens now

From the user's phone (2026-11-24): lowering the raised card should feel like a comments sheet: the same card goes down. A route answer ("302동 가는 길") still flickers when the raised card is lowered.

The frame has two forms of the bottom sheet: the open card (`OpenCard`) and the docked card (`DockedCard`). Lowering an answer that docks runs the open card down to the dock's height and then, 220 ms later with the motion over, unmounts it and mounts the docked card (`useShownForm`). Ticket 54 made the meal answer's open card start with what its dock shows, so that its swap shows little. Every other kind still changes its content at the end of the motion, and every kind remounts its dock there, whose line measures itself again ("더 보기" or "›" comes a frame late).

The answers that dock (`restOf`), and what each does today when the raised card is lowered:

| Answer | Dock | Raised card | At the end of lowering |
| --- | --- | --- | --- |
| Meal Plan ("배고파" with a Friend) | the Assistant's sentence | the sentence, the person chips, the kinds, the list | the dock is mounted in the open card's place; the sentence stands still (ticket 54), the line's "더 보기" comes a frame late |
| Meeting Plan with nothing to read | the Plan's chips' row | the chips, the line, the steps | the steps go and the chips' row comes in one frame |
| Plan beside a Quest the User holds | the model's line and 그대로 두기 | the Plan's card | the card's content is replaced by the line |
| Proposal on the map | the header alone | the Proposal's words | the words vanish at once |
| Lookup: a way or route ("302동 가는 길"), a place, hours, a menu, the shuttle, a study area's seats, where a Friend is | the model's words or the Lookup's headline (none for a drawn way), its ask chips, its note | the model's words over the Lookup's card | the card's lines and buttons vanish and the dock's line, in a smaller type, takes their place |
| A refusal with buttons, a failure (다시 시도), a question back with offers or pickers (지도에서 고르기, 시간 고르기), a Quest to cancel or leave | the first line and the buttons as chips | the whole words and their buttons | the words are replaced by the one line and the chips |

An answer that does not dock (a reply with cards, several parts, a booking on the map with its seat card, a Plan with something to read) is the open card at every step and swaps nothing.

A drag down from the lowered card that is let go short of closing snapped back up at once, not with the card.

## What to build

- One sheet for every answer. The frame's card is the open card in every form; an answer that docks passes its dock, which lies over the top of the scrolling part, opaque, and is laid out once.
- The lowered step of an answer that docks is the dock's own height, measured from the dock's layout. Raised and full are as before.
- The dock fades in on the UI thread with the card's offset over the last 32 dp of the way down (less when the raised step is closer), and out the same way going up, so that a drag stays in step with the finger and nothing changes when the motion ends. At rest the open content under the dock is hidden from screen readers and touches; raised, the dock is.
- The dock stays mounted while the card is raised: its effects that act only at rest (a meal dock closing a menu, the time picker's sheet) wait until the card rests at the dock.
- The whole dock takes a drag as the docked card did: down past half the card closes the answer, up past 40 raises it; the header takes the card's own drag.
- A drag let go short of closing runs back with the card in 220 ms, none with reduced motion.
- No other behaviour changes.

## Acceptance criteria

- [x] Lowering an answer that docks runs to the dock's height and keeps the same card: neither the dock nor the open content is mounted again (unit test).
- [x] At rest a screen reader finds the dock and not the open content; raised, the open content and not the dock (unit test).
- [x] The frame's integration tests pass with the docked card's drag on the dock.
- [x] On the emulator (mock build, motion forced on and slowed in app code for the check), a route Lookup, a meal Plan, a menu Lookup, a study area's seats, and a refusal each lower and rise as one card with nothing swapped at the end, at font scale 1.0 and 1.3, seven drags up and down in a row included. The mock build has no meeting answer that docks, nor a Lookup of hours; they take the same frame. Checked on the phone before the merge.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-24)

- Agent time: about 2 hours 10 minutes in this session, the emulator checks and the test runs included (an estimate from the session's timestamps). No subagents.
- Tokens: an estimate: output about 70k; input about 60M, almost all cache reads, with about 600k cache writes.

### Agent usage (2026-11-24, review pass)

- Agent time: about 1 hour 30 minutes more in this session for PR 537's review (the kept seat card mounted once, the docked answer opening at its dock, the lead's padding), the test runs, and the emulator pictures (an estimate from the session's timestamps). No subagents.
- Tokens: an estimate: output about 40k; input about 35M, almost all cache reads, with about 300k cache writes.
