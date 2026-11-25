# 70: A press on a place that cannot be done says why

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

On a meal answer's map, the places that cannot be done (the answer's `dropped`, listed under the candidates with their reasons) are pale dots. The main server tags each one "두레미담 · 13분밖에 못 있어요". The app places that tag only where it has room, after every other label. On a crowded map it rarely has any, and a press on the dot does nothing: the mark takes no press.

The user's question (2026-11-26): "안되는 식당들은 흰색 점으로 뜨는구나? 이걸 눌렀을때 아무것도 안뜨는게 맞지? 왜 안되는지에 대한 설명은 없어도 되나?" The proposal on board z2 was approved.

## What to build

1. **On a meal answer's map, a dropped place is a quiet dot without words.** Its dot is as it is today.
2. **A press on it shows one small tag beside it:** the place's name and the reason the list gives for it, the same words ("두레미담 · 13분밖에 못 있어요"). The words come from the answer's `dropped`, as the list's do.
   - The tag is placed as every label is, and is never left out: it takes the first side that fits, else the best one (`keptAt`).
   - The dot's look stays quiet. The place never becomes the pick, and nothing of the Plan changes. The camera does not move.
3. **What takes it away:**
   - a press on another mark;
   - a tap anywhere else on the map, seen by the same watcher of the map's touches as a building press;
   - another Plan on screen, or a new answer.
   - A second press on the same dot keeps it.
4. **Built for a closed place later.** The words of a quiet place are one map from its mark's id to its words (`quietWords`). A closed place's dot could carry "오늘 쉬어요" by adding its entry, once how closed places are listed is decided. Closed places are not part of this ticket.

## Acceptance criteria

- [ ] A meal answer's dropped places have no tag. Once one is pressed, it carries the list's words, and its dot is unchanged. (Unit test of the drawing.)
- [ ] A press on a dropped dot shows its tag. A press on a candidate, a tap elsewhere on the map, or another answer takes it away. The camera is not asked to move. (Unit test of `useAnswerMap`, failing before.)
- [ ] Lookups' dropped places (the study area's rooms) are drawn as before.
- [ ] No native file changes. Lint, format, and types pass on the app.
