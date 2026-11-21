# 06: A Proposal stands on the map

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [02](02-flag-says-what-and-when.md) for the attached card, [05](05-lookups-and-words-one-line.md) for the bottom.

Native files: none. Releases: an app OTA update only.

## What to build

A reply with a Proposal (the 파티 the Assistant filled in) is drawn on the map like a Plan (boards 10 and 11): a flag at the Proposal's Place with its title and its start with the day word ("민수와 만나기 ›" / "14:00 내일(수) · 비공개"), my way there, and the invited Friends' faces where their positions can be seen. A tap on the flag opens the attached card with the form's rows (제목, 공개 범위, 정원, 초대, and the board for a 공개 Quest); a tap on a row opens the existing edit form at that field. The bar shows the Proposal's day with my classes that day from my timetable and a mark at its start (a Proposal has no end). The button beside the input reads "만들고 초대 보내기" when it invites someone, else "만들기".

## What happens now

- The Proposal is a card of form rows and recruiting text in the bottom card (`ChatProposalCard`), up to 29 lines, with 수정 and 만들기. Nothing of it is on the map.

## What changes

- A scene made in the app for a Proposal with a Place: the Place's position from the list of Places, my position, a walk from me to it, and the invitees' faces from the everyday map's Avatars. A Proposal without a Place keeps the card in the raised view, with the button beside the input.
- The bar for a Proposal: the day of `startsAt`, my classes of that day, now when it is today, and the start mark.
- 만들기 and 수정 do what they do today.

## Must not break

- Making, editing, and 시설 예약하기 after making (`answer-frame-proposal-card`, `answer-frame-proposal-edit`, `answer-frame-closed-proposal`).
- A Proposal for a Global Event names the event's place.

## Acceptance criteria

- [ ] A Proposal at 학생회관 tomorrow at 14:00 with 김민수 invited: the flag's words, a walk from me, and the button "만들고 초대 보내기". (Integration test.)
- [ ] A tap on the flag opens the rows; a tap on 제목 opens the edit form. (Integration test.)
- [ ] The button makes the Quest as 만들기 did. (Integration test.)
- [ ] A Proposal without a Place keeps its card. (Integration test.)
- [ ] The scene made for a Proposal. (Unit test.)
- [ ] The Proposal on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
