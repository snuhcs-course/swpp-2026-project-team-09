# 08: Teaching a word the rules miss, on the map

Parent: [P07 spec](../spec.md), "Ticket 03: personal and global aliases"
Status: needs-triage
Blocked by: 02 and 03, server and app halves

## What to build

The words most worth learning are the ones no tier reads: 경영대 and 대운동장 answer `none`, so there is no chip to tap, the edit path needs a Proposal that already has a Place, and a correction typed afterwards ("종합운동장 말한 거야") teaches the new words, not the ones that failed. This ticket gives `none` a way to teach.

**Server.** When `resolvePlace` answers `none`, the reply carries one choice of a new kind beside the empty chips: `{ kind: 'place', pick: 'map', words }`. Nothing else changes: the tap comes back as the `chosen` of ticket 02, `{ kind: 'place', id, words }`, which the server checks against the catalog, records as a `chosen` event and teaches as it teaches a chip, so that the User's own alias answers at once and everyone's counts it.

**App.** Under the Assistant's "그런 장소를 찾지 못했어요" the app shows one chip, 지도에서 고르기. A tap opens the map as the party form's Place picker opens it; the pick sends the next message with `chosen` and the Place's name as the text, as a chip's tap does. Cancelling the picker sends nothing.

## Acceptance criteria

- [ ] A `none` answer of `resolvePlace` carries the map choice with the words as written to the resolver; `several` and `one` carry none.
- [ ] A `chosen` message whose id came from the map is recorded, checked and taught exactly as a chip's is (no new path on the server).
- [ ] App: the chip under the reply, the picker, the message sent on a pick, nothing sent on cancel; the mock client answers a `none` with the chip.
- [ ] The replay of ticket 05 counts a map pick as a `chosen` label like any other.
- [ ] `pnpm lint`, `pnpm typecheck` and the touched tests pass in both packages.

## Comments

### Why this and not search chips (2026-11-01)

Chips from `GET /places/search` on the failed words were considered and dropped: the search is a substring match, and the words the rules miss are not substrings of any name (경영대 is in neither SK경영관 nor LG경영관; 대운동장 is not in 종합운동장). The map is the one place every Place can be pointed at.
