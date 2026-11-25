# 05: Filter rows as word tabs

Parent: [A04 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately).

Native files: none. Releases: an app OTA update only.

## What happens now

- `ChipRow` (`design-system/chip-row.tsx`) lays out a row of `Chip`s (`design-system/chip.tsx`).
  - A chip is a 34-high pill with a 1px #858CA0 border on white.
  - Chosen: blue100 fill, navy border and text, and a ✓ icon.
- `ChipRow` is used by:
  - the 내 파티 filter (전체 N / 비공개 N / 공개 N, `screens/party/mine-tab.tsx`);
  - the friend panel's filter (전체, 공강, 수업 중, 이동 중, 위치 켜짐, 위치 꺼짐, `screens/main/friend-panel.tsx`);
  - the Quest screen's filter (전체 / 강의 / 파티, `screens/quests/quests-screen.tsx`);
  - `screens/events/events-bar.tsx`;
  - the catalogue.
- The 행사 tab's own filter is already word tabs: plain 16pt words, the chosen one on a blue100 rounded rectangle (radius 12) in bold navy.
- A bare `Chip` is also used for picking: interests, tags, the friend picker, card choices, and others.

## What to build

Follow the changelog's § 1-2, § 4-2 and § 6 (`references/changelog-11-24.md`) and the canvas boards Party and P15-04-after-panel (<https://claude.ai/artifact/NgBrKLs1RhN9tVywM6376Y>):

- The filter row draws word tabs.
  - The chosen one is a blue100 rounded fill with bold navy text.
  - The rest are grey text, with no border and no ✓.
  - Match the 행사 tab's filter so the two look the same.
- Only filter rows change. A bare `Chip` used for picking keeps its pill. Choose how: a variant the row passes, or the row drawing its own tabs. Picking chips must look unchanged.
- The chosen tab stays selected for accessibility.
- Touch targets stay at least 44 high.

## Must not break

- Choosing a filter still filters: 내 파티, the friend panel (including hiding empty filters), the Quest screen.
- Picking chips (interests, tags, the friend picker, card choices, the Assistant's food-kind chips) look and behave as before. The food-kind chips are ticket 02's.
- Tests: `design-system/chip.unit`, `design-system/chip-row.unit`, `friend-panel`, `party-mine`, `catalogue` (`.integration`), and any test `git grep` finds that relies on the ✓.

## Acceptance criteria

- [ ] A filter row's chosen tab is selected for accessibility and draws no ✓. (`chip-row.unit`, which fails before the change.)
- [ ] A picking `Chip` is unchanged. (`chip.unit`.)
- [ ] "Before" and "after" emulator screens of the 내 파티 filter, the friend panel and the Quest screen go in the pull request.
- [ ] No native file changes; lint, format and types pass on the app.

## Comments
