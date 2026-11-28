# 55: The filter row keeps its height, so the list under it starts at the same place whichever filter is chosen

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

The user on 2026-11-28, on the 행사 tab: "전체 탭의 첫 항목 높이랑 파티 모집중 탭의 첫 항목 높이가 미세하게 달라 보이네." On his phone the chip row sat about 2.7 points higher, and the first row about 5.3 points higher, with 전체 than with 파티 모집 중.

- **Cause.** The filter row is a sideways `ScrollView` with `flexGrow: 0` and React Native's default `flexShrink: 1`. Under it, the list's `ScrollView` takes its content's height as its base size. With 전체 the list is long, the column overflows, and Yoga shrinks both, so the filter row loses about 5 points. With 파티 모집 중 the list is one row, nothing overflows, and the row keeps its 60.
- **Duplication.** The 행사 tab drew this row with its own copy (`events-bar.tsx`'s `Filters`) of the shared `ChipRow`, which had the same fault.

## What to build

- `ChipRow` never shrinks (`flexShrink: 0`).
- The 행사 tab's filters are a `ChipRow`, and `events-bar.tsx` goes. Its chips now start at 20, the app bar title's left edge, as on 파티; they were at 16.

## Checked

| Row                                   | Was                                      | Now                      |
| ------------------------------------- | ---------------------------------------- | ------------------------ |
| 행사 filters                          | own copy, shrank under a long list       | `ChipRow`, never shrinks |
| 파티 찾기 boards (`find-bar.tsx`)     | `ChipRow`, shrank under a long list      | never shrinks            |
| 내 파티 chips (`mine-tab.tsx`)        | `ChipRow`, shrank                        | never shrinks            |
| 친구 panel chips (`friend-panel.tsx`) | `ChipRow`, shrank                        | never shrinks            |
| 식단 days (`menus-screen.tsx`)        | in a plain `View`, which does not shrink | unchanged                |
| 알림                                  | no chip row                              |                          |

## Acceptance

- [ ] `ChipRow` keeps `flexShrink: 0` (unit test, failing before).
- [ ] The 행사 tab's filters still filter (integration tests).

## Comments

### Agent usage (2026-11-28)

- Agent time: about 8 minutes in the app-fixes session, measured from its transcript (an estimate). That session worked on several tickets at once, so its time and tokens are split by which ticket each step named. Pauses longer than five minutes are not counted.
- Tokens: output 21k; input 29.0M, of which 29.0M cache reads, 43k cache writes and 92 uncached. No subagents.
