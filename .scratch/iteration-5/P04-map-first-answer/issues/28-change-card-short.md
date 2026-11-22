# 28: A made 파티's change card keeps its buttons in view

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([25](25-made-party-changed-in-place.md) and [26](26-place-and-time-picked.md) are merged).

Native files: none. Releases: an app OTA update only.

## What happens now

From the phone screens of tickets 25 and 26 (mock build, 2026-11-22):

- A change of a made 파티 shows the whole Proposal card: eight rows and the description. 파티 보기 and 바꾸기 sit below the fold, under the input, and are reached only by scrolling the card.
- While a Place is picked, the dock's line "지도에서 건물을 눌러 주세요" ends with "›" and a press raises the card.

## What to build

- A change's card shows only the rows a change can move and the title: 제목, 언제, and 어디서, with no description.
- While a Place is picked, the line takes no press and has no "›".

## Acceptance criteria

- [ ] A change's card shows 제목, 언제, and 어디서, and neither 인원 nor the description. (Integration test.)
- [ ] While picking, the line has no "›". (Integration test.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 25 minutes in the session of tickets 24 to 27 (an estimate from the transcript's timestamps): the four pictures in five holds of the emulator, and this fix. No subagents.
- Tokens: an estimate: output about 20k; input about 12M, almost all cache reads, with about 70k cache writes.
