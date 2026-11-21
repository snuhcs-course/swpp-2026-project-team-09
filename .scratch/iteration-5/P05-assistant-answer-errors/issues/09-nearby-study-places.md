# 09: Nearby study places: every open space in view, and study-building names

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the main server.

## What happens now

- "근처 공부할 곳" keeps the spaces inside the map's view, then draws and names one pick (the longest stay, ties broken by the shortest walk). A reading room in 15동 that was on the screen was never named: "보는 범위에선 관정관".
- The place lookup matches parts of Place names only. Students call 4동's library "인문대"; that name is only in the study spaces' building names, so "인문대라는 이름의 건물은 지도에서 찾을 수 없어요".

## What to build

- The study answer keeps its pick and adds the best space of up to two other buildings in view that the User may use, ranked as the pick is. They are drawn as candidates, named in the basis with their walk and stay, and given to the model, and the first line says how many more there are ("보는 범위에선 **관정도서관** 외 2곳").
- "인문대" is a campus short name: the College of Humanities' buildings, 1동–7동, with its library, 신양인문학술정보관 (4동). Asked for a place to study there, it means 4동. A short name is data in the model's rules (`campus-terms.ts`), so the place lookup itself is unchanged.

## Acceptance criteria

- [x] With two buildings in view the User may use, both are in the answer, the pick first, the other as a candidate and in the model's words. (Unit test, fails before the fix.)
- [x] "인문대" is in the campus short names and names Places the seed has. (Unit test, fails before the fix.)
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 3 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 13k; input 8.4M, of which 8.4M cache reads, 26k cache writes and 38 uncached. No subagents.
