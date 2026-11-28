# 41: One colour means one thing, the same on every screen

Parent: the user's rule of 2026-11-28 ("행사 파티 색상은 서울대의 참여하기 버튼처럼 진한 파란색을 사용하는 것으로 하자", then "우선 색상은 일관되게 사용할 수 있도록 작업하고 나면 색상 바꾸는건 어렵지 않으니 권장대로 진행하자").
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: an app OTA update.

## What changes

- **One table.** `kindTone` in `design-system/tokens.ts` holds each kind's ink, soft ground and icon: meal (coral), study (the 공부공간 blue), event and party (the navy of the 참여하기 button, both for now), class, shuttle, time (gold) and late (the danger red). The map's pins (`map-kinds.ts`, `map-service-pin.tsx`), the place card's head (`card.tsx`) and the layer toggles read it.
- **An answer takes its kind.** `answerTone` (`features/assistant/answer-tone.ts`) gives every kind of answer and of step its tone. `drawingOf` hands it to the scene; its pick's and candidates' dots and labels take it (`inKind`), and so do the several requests' done flags and the chat cards' flags. The map's marks look up `kindTone` by it (`markTone`), in place of the `mealPick`, `studyPick`, `studyEdge`… branches. An events answer and the Quests are navy with no events code.
- **The list, the opened place and the steps.** The rows' chosen tint and numbers, the opened place's number and the steps' done numbers read the table by their answer's or step's kind.
- **Gold is the time's alone.** Gold that stood for a Quest is the party's navy: the main screen's route line, the Quest pill's flag, the made-Quest line, the place card's pin and suggestion, a Proposal's head and moved values. The Timetable's crossing warning takes `color.warning`; the longest way on a restaurant card is a heads-up in `color.warning`; the asked examples take their kinds.
- **Left alone.** `color.quest` and `color.party` themselves, and the 파티 tab, the room, 알림 and the 행사 tab's sheets, which open PRs change: the next PR.

## Acceptance criteria

- [x] Every kind of the table has an ink, a soft ground and an icon or none; every kind of answer and of step has a tone; gold is the time's alone and the danger red a warning's alone. (Unit test, new.)
- [x] The picks of a meal, a study, an events and a Quests answer take their kind's colour, the round and the label's edge. (Unit test, new; it fails before the change for the events and Quests answers, which were gold.)
- [x] The tests that asserted the old colours by value say the rule now.
- [x] No native file changes; lint, format and types pass on the app.

## Comments
