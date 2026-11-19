# 63: One globe icon, and a test of a tap on the map while the tutorial draws on it

Parent: [P15 spec](../spec.md), item 63; left over when #358 (ticket [54](54-events-tab-as-drawn.md)), #359 (ticket [53](53-freshman-tutorial-as-drawn.md)) and #367 (ticket [55](55-cancel-the-walking-route.md)) merged on 2026-11-18
Status: ready-for-agent
Owner: AhnJinYoung
Blocked by: none

Native files: none. Releases: an app OTA update only. Nothing a User sees changes.

## What is there now

- The design system's icons hold the same globe twice: `globe`, added by #358 for the 행사 tab's "원문 보기", and `web`, added by #359 for the tutorial's links. Both pull requests said that whichever merged second would take the first's name; the merge kept both.
- #359 and #367 met in the map's tap path. The rules hold on `4.0/Main`, but no test says so: on the everyday map one tap on empty map takes away both the tutorial's place pin and the walking route, and while a quest's guide is open a tap clears nothing.

## What changes

- `web` is removed, and the tutorial's links, link buttons and 🌐 button draw `globe`.
- A new integration test, `tutorial-map-tap`, holds the two rules of a tap while the tutorial draws on the map.

## What stays as it is

- Every screen: the two icons were the same drawing.
- The tap's behaviour: the test describes what `4.0/Main` already does.

## Acceptance criteria

- [x] `mobile/src/design-system/icon.tsx` has one globe, `globe`, and nothing names `web` as an icon.
- [x] On the everyday map, a tap on empty map removes the tutorial's place pin and the walking route together.
- [x] While a guide is open, a tap on the map clears nothing, and the route its 길찾기 drew stays.
- [x] Tests, by ADR 0007: `tutorial-map-tap.integration.test.tsx` renders the main screen over the mocks and checks both rules; the tutorial's other tests still pass.

## Comments

### Notes from the implementation (2026-11-19)

- The change was written on #359's branch while its merge with `4.0/Main` was being checked, and #359 merged before it was pushed, so it comes as a pull request of its own.
- Checked: `tsc`, CI's lint (`oxlint --type-aware` and the test-level check) and Prettier over `mobile`; `tutorial-map-tap`, `tutorial-guide` and `tutorial-sheet` run one file at a time.

### Agent usage (2026-11-19)

Estimates:

- Agent time: about 25 minutes: one Opus 5.5 subagent wrote the change and the test while checking #359's merge, and the main session (Fable 5.2) moved it to a branch of its own, ran the checks and wrote this ticket.
- Tokens: output about 12,000. Input about 2.5 million, of which about 2.4 million cache reads and about 0.1 million cache writes.
