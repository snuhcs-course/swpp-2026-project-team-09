# 05: Filter rows as word tabs

Parent: [A04 spec](../spec.md)
Status: done
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

- [x] A filter row's chosen tab is selected for accessibility and draws no ✓. (`chip-row.unit`, which fails before the change.)
- [x] A picking `Chip` is unchanged. (`chip.unit`.)
- [x] "Before" and "after" emulator screens of the 내 파티 filter, the friend panel and the Quest screen go in the pull request.
- [x] No native file changes; lint, format and types pass on the app.

## Comments

### Done (2026-11-26)

`ChipRow` draws its own word tabs with the 행사 tab's values (40 high, 16 at the sides, radius 12, a row 60 high; `eventText.filter` in `inkMuted`, and `filterChosen` in `snuBlue` on `blue100` when chosen). The chosen tab keeps `selected` and its name ("전체 12"), and its touch area is 48. `Chip` is unchanged in look; only its ✓ gets `testID="chip-check"` for the tests. No screen file changed. Pull request #561, with the "after" screens in `references/after/05-*.jpg`.

Follow-up for ticket 07: `Filters` in `events-bar.tsx` now repeats this tab almost line for line and could use `ChipRow`.

### Agent usage (2026-11-26)

- Agent time: about 35 minutes in one session, including two debug builds of the app and the emulator screens (an estimate).
- Tokens (the session and its two review subagents): input 9,837,870 in all (9,654,975 cache reads, 182,673 cache writes, 222 uncached); output 43,296.
