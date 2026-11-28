# 61: A 파티 is a navy round and a 행사 a white round with a navy ring, so that both stand out on the map

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

On the map, a 파티's and a 행사's markers are hard to see unless you look closely.

- **The look.** Each is a pale glass round (`MapTag` in `mobile/src/design-system/map-tag.tsx`): the glass `inner` level, white at 90%, a 1 point navy rim at 28%, a thin navy line icon on navy at 14%, a shadow at 12%, 26 across.
- **The ground.** The map under it is pale too, so the marker weighs about as much as the map's own POI icons.
- **Two kinds alike.** A 파티 and a 행사 differ only by their icon.
- **A group** of several kinds at one place (P20-04, `map-group-pin.tsx`) is the same light glass with a tinted round for each kind.

## What to build

Option A of the mockup, chosen by the user on 2026-11-28. The user also said: "다른 디자인컴포넌트는 바꾸지말아".

1. **파티.** A solid navy round (`color.snuBlue`, `#001A72`) of 28 inside a white ring of 2, 32 across. A white icon of 16. The shadow is `shadow.dot` (`0 1px 4px rgba(14, 19, 48, 0.35)`).
2. **행사.** A white round inside a navy ring of 2, a navy icon, the same size and the same shadow.
3. **A group.** A navy capsule 28 high inside a white ring of 2, each kind's icon in white side by side, 6 apart and 6 from the ends. It is drawn this way whichever kinds it holds; a Favorite Event's star is white and filled.
4. **From far away**, while the whole campus is in view, the same in proportion to today's 20 of 26: a round of 20 inside the ring, 24 across, with an icon of 12. A group's capsule is 20 high, its icons 4 apart.
5. **With a name** (the map's "names" level), the round grows into a capsule with the name after the icon: white on a 파티 and a group, navy on a 행사.
6. **Chosen.** The ring stays, and a soft navy ring of 4 (`halo.selectedTag`) goes round it.
7. **Kept as they are.**
   - The anchor (the middle), the overlap rules and the zoom levels.
   - The count badge (`MapCount`) and the "!" of a fresh mark (`MapMarkBadge`). The "!" falls on the white ring, never on the navy.
   - A 퀘스트's light tag at 70%, 내 일정's light tag, people's and Friends' markers, a group's card head (`KindRounds`) and every other component.
   - No new colour: `color.snuBlue`, `color.surface`, `color.onPrimary`, `shadow.dot` and `halo.selectedTag` are existing tokens.

## Checked

- **Pictures.** The native map draws each look as a picture captured with a margin of 12 (`IMAGE_MARGIN`). The marker of 32, its shadow of 4 and the chosen ring of 4 fit inside it.
- **Touch.** On the native map a press lands anywhere on the picture, at least 24 + 24 = 48 from far away and 56 from close. On the plain map each marker is a `Pressable` with a `hitSlop` of 12, which gives the same. Both are at least 44.

## Acceptance

- [ ] A 파티 is navy in a white ring, a 행사 white in a navy ring, 32 across from close and 24 from far away, on `shadow.dot` (unit tests, failing before).
- [ ] A group is a navy capsule in a white ring, 32 high from close and 24 from far away (unit tests, failing before).
- [ ] A 퀘스트 keeps its light tag at 70% (unit test).
- [ ] The marker and map tests still pass.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 55 minutes, an estimate. One session in its own worktree, from 20:53 to about 21:48 Korea time: the code, the tests, the ticket, the pull request and a screenshot attempt that was stopped. Jest runs, the two app bundles and the emulator's boot are about 25 minutes of it. The orchestrating session's time is not counted here.
- Tokens, this session alone (no subagents), up to this entry: input 218 uncached, with 12,851,876 read from the cache and 147,128 written to it; output 42,634.
