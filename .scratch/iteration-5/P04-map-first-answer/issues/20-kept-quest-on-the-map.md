# 20: A Quest already set is marked on the map

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [17](17-meal-already-set.md) (the answer beside a Quest already set); P05's PR 439 (`KeptQuest.point`, merged).

Native files: none. Releases: an app OTA update only.

## What happens now

An answer beside a Quest the User already holds says so in words ("이미 12:16 302동식당 점심이 있어요. 바꿀까요?"), but the map does not show it. When that place is also one of the new Plan's candidates, it is drawn as just another candidate, and the eye cannot tell which place the question is about. 그대로 두기 closes the answer.

## What to build

- **The tag:** the place of the Quest already set (`planSet.point`) is marked apart from the candidates: a small grey dot and a label with a grey outline and no number, "잡힌 점심 12:16", "잡힌 저녁 18:30", or "잡힌 약속 15:00". It is one of the Plan's own marks: the camera keeps it in view, and a Friend's face near it gives way, so that its words are whole. It takes no press.
- **At a candidate's or the pick's place:** the point carries both labels, the candidate's ("4 302동식당") and the tag.
- **No point** (a step with no Place, a server before P05's PR 439, or a `mealSet` alone): no tag.
- **그대로 두기** leaves the Quest as it is and keeps the answer open: the new Plan's marks, its bar, and the button go, the tag is the only mark beside the User's own ("나"), which the camera fits together as it fits a Plan (never the closest zoom on the tag alone; without the User's mark it stays where it was), and the dock's line says "12:16 302동식당 점심을 그대로 뒀어요", with no chip. ✕ or a drag down closes the answer. As a meeting's 바꾸기 does, the answer stays and shows what now stands.
- **After 바꾸기** (a meal made, a meeting changed): the tag goes, for that time no longer stands.

## Acceptance criteria

- [ ] An answer beside a lunch held alone whose point is candidate 4's place draws both the candidate and "잡힌 점심 12:16" there; a meeting kept elsewhere draws "잡힌 약속 15:00" at its own point; no point, no tag. (Unit test.)
- [ ] After 그대로 두기 the tag beside the User's mark, both fitted, or the tag alone with the camera still; the tag among the marks a Friend's face gives way to. (Unit test.)
- [ ] The tag on the answer's map with the Plan's Friend still drawn, and after 그대로 두기 the only mark beside "나", with the line, no chip, no button, and no bar; nothing is sent. (Integration test.)
- [ ] After 바꾸기 of a meeting, no tag. (Integration test.)
- [ ] A meal and a meeting already set, and 그대로 두기, on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 65 minutes in this session (an estimate from the transcript's timestamps, over a stretch it shared with PR 442's review fixes, which ticket 17 records): the tag and 그대로 두기 test-first, the merge of PR 442's fixes, and two rounds of phone screens with the screen review's changes. No subagents.
- Tokens: output 128k; input 53.8M, of which 53.5M cache reads, 293k cache writes, and about 330 uncached.
