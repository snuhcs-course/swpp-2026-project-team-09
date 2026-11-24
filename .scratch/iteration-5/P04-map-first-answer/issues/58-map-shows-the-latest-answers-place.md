# 58: The map shows the place the latest answer is about, never a stale one

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: an app OTA update only.

## What happens now

Found on the phone on 2026-11-23. In one conversation the User asked "302동 몇시까지해?", then "내일 301동 메뉴 뭐야?". The words answered 301동식당's menu, but the map still showed the first answer's mark: 302동식당 with "지금 닫음 · 오늘 영업 끝".

## Cause

Both halves, read on `5.0/Main`:

- The main server's `findMenu` sends a menu Lookup only when it finds a meal Plan for the User at the Restaurant. When the menu is not posted, the meal is not served, the meal is over, or the User has no free time then (likely for "내일"), it answers `none` with the menu's lines, and the reply is words alone, with no Place for the map.
- The app keeps the latest turn that drew a scene under a follow-up answered with words alone (P04 ticket 46, `sceneBubblesOf`), so that a seat card or a meal's Plan goes on working. It kept the hours Lookup the same way, though nothing in a fact goes on working, and the new words were about another Restaurant.

## What to build

- A turn whose replies only tell a fact (a Lookup with `fact: true`: a Restaurant's hours or menu, P05 ticket 47) stays on the map only while the next reply is on its way. Once a later reply comes, of any kind, the map draws that reply's scene, or the everyday map when it has none.
- Everything ticket 46 keeps is unchanged: a seat card, a meal's Plan, and a Lookup that is not a fact stay under words alone.
- A follow-up that draws its own scene (an answer, a Lookup, cards, a Proposal, several requests, a map button) replaces the scene, as before.

Not here: drawing the Restaurant of a menu answered `none` (a main-server change; it would need a Release).

## Acceptance criteria

- [x] A fact Lookup leaves the map under a follow-up answered with words alone; it stays while the follow-up is on its way. (Unit test.)
- [x] A menu Lookup marked `fact` leaves the map under words alone; the same Lookup without the mark stays. (Integration test.)
- [x] Ticket 46's kept seat card and meal Plan are unchanged. (Integration tests.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-24)

- Agent time: about 30 minutes in the p04-58 session (an estimate from the transcript). No subagents.
- Tokens: an estimate: output about 15k; input about 2.5M, almost all cache reads, with about 60k cache writes.
