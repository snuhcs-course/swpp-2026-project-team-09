# 03: Faces and my start do what the chips do

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [02](02-flag-says-what-and-when.md) for the attached card.

Native files: none. Releases: an app OTA update only.

## What to build

Every control of the condition chips gets a place on the map, so that ticket 04 can take the chips away. A press on the face of a person in the Plan opens its attached card: the name, 프로필, and 빼기. A press on my own start label ("나 13:45 출발") opens a card that lists the buildings to set out from, as the origin chip does today. The + on a Friend's face still adds the Friend. Candidate places stay the numbered dots that switch the Plan.

## What happens now

- The person chip opens the Friend's profile, and its ✕ takes the Friend out.
- The origin chip opens 장소 선택, where a building is picked to set out from.
- A press on the face of a Friend the Plan does not hold adds them (`+`); a press on a face the Plan holds does nothing.

## What changes

- Plan people's faces and my start label take a press and open the attached card of ticket 02; once the Plan is sent, they take none.
- 빼기 asks the same recalculation as the chip's ✕; "다른 건물에서 출발" opens 장소 선택 as the origin chip does; 프로필 opens the same profile over the answer.
- The chips stay in the card in this ticket.

## Must not break

- The + on a face, and the face's light while its add is on its way (`answer-correct-people`).
- Once "이대로 초대" is sent, faces show how each Friend stands and take no change.
- The ✕ of a meet's only Friend closes the answer and goes back to that Friend's card.

## Acceptance criteria

- [x] A press on 민수's face opens the card with 빼기 (and 프로필 for a Friend); 빼기 asks the recalculation without 민수. (Integration test.)
- [x] 프로필 opens the Friend's profile over the answer, by the same opener as the chip's. (Shared with the chip; not tested again.)
- [x] A press on my start says where I set out from and opens 장소 선택, as the origin chip does; the recalculation from a building chosen there is the chip's own (`answer-correct-origin`). (Integration test.)
- [x] After "이대로 초대", a face takes no press. (Integration test.)
- [x] The face's card and the start list on a phone with the mock build. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Emulator check (2026-11-21)

The debug app with Metro from this branch in mock mode. A Friend's card, 만나고 싶다, then a press on 민수's face: the card opened with 민수 and 빼기 (the mock's 민수 is not among the Friends, so no 프로필). The User's start was outside the camera's view in that answer, so its card was checked in the test only.

### Agent usage (2026-11-21)

- Agent time: about 17 minutes in the same session as tickets 01 and 02 (an estimate from the transcript's timestamps), with the emulator check.
- Tokens: output 23k; input 17.5M, of which 17.5M cache reads, 42k cache writes, and 74 uncached. No subagents.
