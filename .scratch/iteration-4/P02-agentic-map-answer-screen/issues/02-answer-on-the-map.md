# 02: The answer drawn on the map

Parent: [P02 spec](../spec.md) ("The answer on the map")
Status: ready-for-agent
Blocked by: 01

## What to build

A User whose phone has the switch on asks "배고파, 민수랑 같이", and the Plan the main server calculated is drawn on the map: one solid line for each person from where they set out, the picked Restaurant with its time, the flag at the Merging Point, the Place of the next Class, and the other candidates as numbered dots. The map moves so that all of it is visible between the pill and the card, and the map's usual markers give way. The card shows the Plan's two lines, opens what it rests on when "근거" is pressed, and goes through the other candidates with its arrows or with a press on a candidate's dot.

## Acceptance criteria

- [ ] **The marks** of the Plan on screen follow the spec's table: the User's dot, each Friend of the Plan as a round face whose ring is dashed for a position taken from the Timetable, the picked Restaurant with its number and the time of its flag, the other candidates with the numbers of their Plans, a Restaurant that does not fit with its reason, the Place of the next Class, and the flag at the Merging Point. Each mark has a name a screen reader says.
- [ ] **Where the words go** follows the spec's rule: one symbol at a point, and each label at the first free side of its kind. For the stored copy of the answer to "배고파, 민수랑 같이", third Plan: at 301동 the User's dot with "나 · 15분" at its right, "301동식당" at its left, and "12:18 민수와 만남" above it; at 302동 민수's face with "민수 · 18분" at its right and "302동식당" at its left; and at 학생회관 the picked dot with "학생회관식당" and "12:33 점심" below it.
- [ ] **The lines**: one straight, solid line for each route of the scene, the User's in navy, a Friend's in the Friend colour, and the way to the next Class fainter and thinner.
- [ ] **What gives way** while a Plan is drawn: the markers of events, Quests, Restaurants, Study Spaces, and the shuttle, the shuttle's line, and a walking route. Friends' Avatars stay, except those of the Plan's people, and the User's own Avatar gives way to the scene's. Closing the answer brings them back.
- [ ] **The camera** fits the answer's points into what the pill and the card leave of the map, no closer than the "close" level, when the answer comes, when the Plan on screen changes, and when the card's height changes.
- [ ] **The card of a Plan**: the two lines; "근거", which opens the basis and, as "근거 접기", closes it; and "‹" and "›" with the count ("3/5") when the answer has more than one Plan. The arrows go round, and a press on a candidate's dot shows that candidate's Plan.
- [ ] An answer without a Plan draws nothing on the map and keeps the everyday map under the card.
- [ ] The looks of every Plan of the answer are asked for when the answer comes.
- [ ] **Unit tests** for the function from an answer to its marks, on the stored copies of real answers (the answer for two people, the answer for three with a Merging Point and Restaurants that do not fit, and the answer with a fixed start), with the boundaries of the spec's Testing Decisions; and for the new looks' names.
- [ ] **Integration tests** at the main screen over the fake main server: the marks and the lines of the Plan on the plain map, what gives way and comes back, the camera's fit, the arrows, a press on a candidate, and the basis.
- [ ] The stored copies of four more real answers are added as the main server returned them: for the User alone, for three people, with a fixed start, and from another starting Place.
- [ ] The design system's catalogue shows the new marks, and the app's README says how an answer is drawn.
- [ ] The screen is run on an Android emulator with Kakao's map, and the pull request carries the screen of a Plan on the map.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass; and no native file of the app changed.

## Comments
