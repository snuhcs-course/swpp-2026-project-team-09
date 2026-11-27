# 15: "+ 같이" on the seat answer alone

Parent: [P10 spec](../spec.md) § With Friends ("Two capabilities"); design `group-study-design` ①, `group-study-resume` § 0
Status: ready-for-agent
Blocked by: 11; the booking's band PR (#637, P01 ticket 14), which moves the seat answer's bar onto the meal's band and owns `time-bar.tsx`

Native files: none. Releases: with ticket 16.

## What to build

The 관정 seat answer alone stays today's seat ticket, since the app does not send `study-plan`. Its time card gets the meal's "+ 같이" slot, in the same place and with the same picker.

- **Adding Friends** posts `POST /assistant/answers` with a study input built from the seat card:
  - `date`, `window` and `minutes` from the span the picker shows: the card's, moved off the busy stretches of everyone checked, the asker's included, as a meal's "+ 같이" previews. The picker never shows one time while 완료 asks another. This was decided by the orchestrator; the user will review it.
  - The head's words follow that span: its length, not the card's "14:00 수업과 겹쳐요" once the span moved off it.
  - `chosen.seatSpaceId` set to the card's space;
  - `together: true`;
  - `people`: the asker, then the Friends picked.
  - `what: 'any'` and `area: null`: the main server reads both for an answer alone only, and `together: true` gives the group answer even before anyone consents.
  - The group answer (ticket 11) takes the card's place.
- **Removing every Friend** from that answer shows the seat card again, with no server call.
- The main server answers a study input with `together: true` only to an app that says `study-group` (422 otherwise), so this needs ticket 16 in the same Release.
- `BookingBar` in `time-bar.tsx` is the one file of the band session this ticket needs, after #637 merges.

## Acceptance criteria

- [x] The seat answer's time card shows "+ 같이", and it opens the meal's picker. (Integration test.)
- [x] Picking three Friends posts the study input above, with `together: true`, and shows the group answer. (Integration test with the mock server.)
- [x] Removing every Friend shows the kept seat card, and no request is sent. (Integration test.)
- [x] 완료 asks the span the picker shows, and the head says that span's length, not the card's clash. (Unit and integration tests.)
- [x] While the conversation waits for that answer, neither "+ 같이" nor 완료 asks again. (Integration test.)
- [ ] The seat answer's own tests pass unchanged. (Integration tests run at the nightly level: none was changed.)
- [x] Whole lint, format and types.

## How it is built

- **One "＋ 같이".** The seat card's bar draws the time card's own chip (`AddChip`) and picker (`usePickingBar`), as a meal's. `usePickingBar` now reads a `PickSource`: the answer on screen (`answerPickSource`) or, for the seat card, which has no answer, the picking the card keeps itself (`useSeatPicking` in `screens/main/answer/seat-picking.tsx`). The rows, the head and 완료 are the same code.
- **완료** is given the span the bar shows (`PickSource.finish`). The seat card builds the study input from it (`seatTogetherInput` in `features/assistant/seat-together.ts`) and asks it as the app's own turn (`askApp`, "같이 공부할 자리"), as a tap on a mark does. The group answer then takes the card's place in the conversation. The chip and 완료 wait while the conversation does (`chat.waiting`).
- **The preview's words** (`previewOf` in `people-picking.ts`, every kind's): a span moved says its new length in the band's own words ("식사 41분", "2시간"), and only its length when the band said what the span ran into. Before, "2시간" kept its old hours, and a seat card's clash words stayed after the span left the clash.
- **Back.** The answer's reply is marked `fromCard`. Every Friend taken out of an answer asked from a card goes back to it (`finishOf`'s `toCard` in `pick-head.tsx`): the chat takes that turn back (`takeBackTurn`), its words and its reply, and nothing else. The mark lives with the conversation, not on the phone apart from it. A time dragged on the group answer since keeps the way back, since the conversation's reply is still that answer.

## "＋ 같이" by answer kind

| Answer | "＋ 같이" | Why |
|---|---|---|
| Meal, alone or with Friends | works | the time card's slot (P04) |
| Meet | works | the same slot; the last Friend taken out closes the answer, as before |
| New party | works, as "초대할 친구 추가" | the same slot |
| Study, alone with a Plan or together | works | the same slot; a group answer held while its consents are out does not open it (ticket 12) |
| An answer with no Plan | works | its frame keeps the people (P01 ticket 31) |
| The 관정 seat card alone | works: this ticket | the same chip and picker; it asks the group answer and comes back with every Friend out |
| A seat card among several steps, a room card | not applicable | neither draws a time card: the steps draw the seat card (P04 ticket 09), and a room card keeps its own card; a group room comes through the group answer (ticket 14) |
| Events, Quests | not applicable | nobody is asked for: their answers name times and parties already set |

## Comments

### Agent usage (2026-11-27)

- Agent time: about 70 minutes (an estimate), in one session:
  - about 40 minutes from 21:20 KST to the pull request, including a sweep of the tests a grep found, stopped partway when local integration runs were limited;
  - about 30 minutes on the emulator pictures, from 22:20 KST, most of it on the temporary fake library, which did not yet answer the reading room's seat calls.
- Tokens: input 380 uncached, with cache reads 81,419,293 and cache writes 335,018; output 104,876. No subagents.
