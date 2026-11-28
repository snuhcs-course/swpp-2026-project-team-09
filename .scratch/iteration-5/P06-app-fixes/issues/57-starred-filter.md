# 57: A ☆ in the 행사 tab's header shows the starred events alone

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

The 행사 tab lists every published event. A User who starred some (the ☆ on each row) can only find them by scrolling. The proposal page `.scratch/iteration-5/notes-ko/handoff/favorites-filter/` drew three ways. The user chose 나 on 2026-11-28: "별표 필터는 나안을 선택할게. 진행해줘." Part 2 of that page (the sheet with no party) is not built.

## What to build

1. **The ☆ in the header.**
   - It sits left of the magnifier, both with a touch area of 48. Off it is an outline ☆ in ink; on it is a filled navy ★, the row's ★ colour.
   - A screen reader hears "별표한 행사만 보기", selected when on.
   - It is `TabScreen`'s `toggle`, drawn with the shared `IconButton`, which gains `on`.
2. **On, the list holds the starred events alone.**
   - The chips 전체 / 오늘 / 이번 주 / 파티 모집 중 narrow within them, and so does the search.
3. **Empty.**
   - "별표한 행사가 없어요" with "행사 옆 ☆를 눌러 모아 보세요" under it (`EmptyState` gains `line`).
   - With a chip, the chip's words come first: "오늘 별표한 행사가 없어요", "이번 주에 별표한 행사가 없어요", "파티 모집 중인 별표한 행사가 없어요".
4. **Kept.**
   - The ☆ stays as it was while the app runs, and is off on a fresh start.
   - An event unstarred while it is on keeps its row until the tab is left or the ☆ is turned off and on.

App only: the starred list is the `favorite` of `GET /global-events`, and no server change is needed.

## Acceptance

- [ ] Off at first; on, only starred events, within the chip (integration test, failing before).
- [ ] The empty words and line (integration test, failing before).
- [ ] An unstarred row stays while on (integration test, failing before).
- [ ] The search within the starred events (integration test, failing before).

## Comments

### Agent usage (2026-11-28)

- Agent time: about 9 minutes in the app-fixes session, measured from its transcript (an estimate). That session worked on several tickets at once, so its time and tokens are split by which ticket each step named. Pauses longer than five minutes are not counted.
- Tokens: output 5k; input 13.2M, of which 13.2M cache reads, 20k cache writes and 40 uncached. No subagents.
