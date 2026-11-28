# 08: The Quest list on the whole screen lies on glass over the map, as the friend panel does

Parent: [A04 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-28: "a04-06인가 그 친구 사이드바 투명도 적용한 거 동일하게 퀘스트 탭 (메인에서 퀘스트 전체 보기 눌렀을 때 나오는 창)도 투명도 동일하게 적용하고 싶음". Positions are as of `origin/5.0/Main` ec8337d6.

- The friend panel (A04-06) is a side panel over the map on the glass layer (`SidePanel glass`, `screens/main/friend-panel.tsx`). While it is open, what floats over the map and the tab bar give way, so only the map shows through (its `useShownOnMain`).
- The Quest list on the whole screen (`/quests`, `screens/quests/quests-screen.tsx`) is a white `FullScreenPanel`, pushed from the bottom above the tabs (`app/(signed-in)/_layout.tsx`). There is no map under it to show through. Before: `references/before/08-quests-screen.jpg`.

## What was decided

The user chose a whole screen of glass over the map, rather than a side panel like the friend panel, on condition that Android can show the map through it. Checked on the Android emulator: it can.

## What to build

- `FullScreenPanel` gains `glass`. The screen lies on a new glass level, `screen`, instead of white, and its app bar is clear, as the friend panel's is. `screen` blurs as `panel` does on iOS 26 (Liquid Glass, untouched); where nothing blurs (Android, iOS before 26) it is white at 85%, denser than a panel's 80%, since the rows stand over the map's own names (decided by the user on 2026-11-28, after PR #759's review). The README's glass table gains the level.
- Only when opened from the map's Quest list (`/quests?over=map`) does the list lie on glass and ask the map's floating parts to give way. Opened from 내 정보's 내 퀘스트, it is white as before and covers 내 정보, which would otherwise show through (PR #759's review).
- The stack shows `/quests` as a transparent modal over the screen under it, with no card colour or dimming of its own, on Android's JS stack and on iOS's native stack. The map stays drawn under it, as it is.
- The friend panel's rule that the map's floating parts and the tab bar give way moves to `screens/main/map-cover.ts` (`useCoverMap`, `useMapCovered`). The friend panel and the Quest list both use it, so only the map shows through either.
- The map under the glass does not move: the list takes every touch. Live marks, such as a Friend's position, still change under it.

## Must not break

- The Quest list's rows, filters, ✕ and Android's back; a row's press (a class to the map, a booking party's answer, another Quest's room).
- The friend panel, which keeps its look and its giving way.
- Every other `FullScreenPanel`, which stays white.
- Tests: `quests-screen`, `friend-panel*`, `main-lists` (`.integration`), `design-system/full-screen-panel` (`.unit`).

## Acceptance criteria

- [x] The Quest list lies on the glass layer's `screen` level (white at 85% where there is no Liquid Glass). (Unit and integration tests, which fail before the change.)
- [x] While it is open, the map's floating parts give way, and come back when it closes. (Integration test, which fails before the change.)
- [x] Opened from 내 정보, it is white. (Integration test.)
- [x] Android shows the map through it: emulator, mock build. After: `references/after/08-quests-over-map.jpg`, beside the friend panel (`references/after/08-friend-panel-alike.jpg`).
- [ ] Checked on the user's phone after the app OTA update.
- [x] No native file changes; lint (type-aware) and format pass on the changed files. jest and tsc run in CI.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 15 minutes, an estimate (gaps under 5 minutes between transcript entries, summed; the emulator's boot and the waits are left out). The ticket, the code, the tests, the emulator check and screens, and the pull request, in one session.
- Tokens: input 29,682,475 (cache reads 28,859,600, cache writes 822,799, uncached 76); output 29,084. No subagents. Counted up to the opening of the pull request.
