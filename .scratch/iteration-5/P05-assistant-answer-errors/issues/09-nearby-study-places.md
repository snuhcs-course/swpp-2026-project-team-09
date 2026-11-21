# 09: Nearby study places: every open space in view, and study-building names

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the main server.

## What happens now

- "근처 공부할 곳" keeps the spaces inside the map's view, then draws and names one pick (the longest stay, ties broken by the shortest walk). A reading room in 15동 that was on the screen was never named: "보는 범위에선 관정관".
- The place lookup matches parts of Place names only. Students call 4동's library "인문대"; that name is only in the study spaces' building names, so "인문대라는 이름의 건물은 지도에서 찾을 수 없어요".

## What to build

- The study answer lists every open space in view, ranked as now, with the pick first, up to a small number, and draws each.
- The place lookup also finds a Place by the building name of its study spaces.

## Acceptance criteria

- [ ] With two open spaces in view, both are in the answer, the pick first. (Unit test, fails before the fix.)
- [ ] "인문대" resolves to 4동. (Unit test, fails before the fix.)
- [ ] Lint, format and types of the main server pass.

## Comments
