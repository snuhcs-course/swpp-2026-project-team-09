# 03: Faces and my start do what the chips do

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [02](02-flag-says-what-and-when.md) for the attached card.

Native files: none. Releases: an app OTA update only.

## What to build

Every control of the condition chips gets a place on the map, so that ticket 04 can take the chips away. A press on the face of a person in the Plan opens its attached card: the name, 프로필, and 빼기. A press on my own start label ("나 13:45 출발") opens a card that lists the buildings to set out from, as the origin chip does today. The + on a Friend's face still adds the Friend. Candidate places stay the numbered dots that switch the Plan.

## What happens now

- The person chip opens the Friend's profile, and its ✕ takes the Friend out.
- The origin chip opens the list of buildings to set out from.
- A press on the face of a Friend the Plan does not hold adds them (`+`); a press on a face the Plan holds does nothing.

## What changes

- Plan people's faces and my start label take a press and open the attached card of ticket 02.
- 빼기 asks the same recalculation as the chip's ✕; the start list asks the same as the origin chip; 프로필 opens the same profile over the answer.
- The chips stay in the card in this ticket.

## Must not break

- The + on a face, and the face's light while its add is on its way (`answer-correct-people`).
- Once "이대로 초대" is sent, faces show how each Friend stands and take no change.
- The ✕ of a meet's only Friend closes the answer and goes back to that Friend's card.

## Acceptance criteria

- [ ] A press on 김민수's face opens the card with 프로필 and 빼기; 빼기 asks the recalculation without 김민수. (Integration test.)
- [ ] 프로필 opens the Friend's profile over the answer. (Integration test.)
- [ ] A press on my start label lists the buildings; a pick asks the recalculation from it. (Integration test.)
- [ ] After "이대로 초대", a press on a face opens no card that changes the Plan. (Integration test.)
- [ ] The face's card and the start list on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
