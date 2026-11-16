# 13: Without a location or a Timetable the answer says so and what it assumed instead

Parent: [P02 spec](../spec.md); the design's row 8, boards n13, n14, n15, principle 4
Status: ready-for-agent
Blocked by: ticket 10 (its offers); #265 (P02-09 changes `use-shown-answer.ts` and `plan-card.tsx`); for n14's drawing, P01 ticket 11 (the answer screen draws a Lookup); "여기로" is package D's

## What to build

- **The request says why a location is missing.** The request context gains `locationMissing: 'permission' | 'off-campus' | null`, so that the server tells no permission (n13) from off campus (n14). No off-campus position is sent.
- **n13, no location permission.** The asker sets out from the building of the previous class, at any time of the day (today only within 15 minutes of its end), and its chip "301동에서" is marked assumed (drawn in the Quest colour). The lines are "위치를 몰라 직전 수업의" / "**301동**에서 출발로 잡았어요", and the card offers "위치 켜기" beside the arrows, which opens the map's location explanation.
- **n14, off campus.** The way answer starts at the main gate: lines "정문을 **08:45**까지 지나면 돼요" / "캠퍼스 밖이라 정문부터 계산했어요", basis "정문 → 43-1동 걸어서 15분" and "지금 위치는 캠퍼스 밖이라 쓰지 않았어요", flag "08:45까지", and the card's note "캠퍼스 밖이라 친구에게 내 위치가 보이지 않아요".
- **n15, no Timetable.** The server reads whether the User has any Class. With none, the candidates come nearest first, the lines say "**301동식당**이 가장 가까워요", the basis "시간표가 없어 가까운 순서로 넘겨 봐요", the card's note "시간표를 넣으면 나설 시각까지 알려 드려요", and the card offers "시간표 넣기".

## Acceptance criteria

- [x] The context's `locationMissing` from the app (permission refused or not asked; off campus) and its check on the server.
- [x] n13: the previous class's building as the asker's origin without a location at any time; the assumed chip; the lines; "위치 켜기".
- [x] n14: the gate branch runs from `locationMissing: 'off-campus'`; the lines, basis, flag, and note.
- [x] n15: no Class at all gives nearest-first candidates, the lines, basis, note, and "시간표 넣기".
- [x] An `AnswerReply` carries its offers as a refusal does (ticket 10's `RefusalOffer`), drawn beside the Plan's buttons.
- [x] Tests on both sides; the real server's replies kept as the app's mock copies.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- The origin rule and the chip's mark change package A's engine (`gathering/`, `meal-answer.ts`, the dto). Their seam lines are in `row-8-seams.md`, ticket 13, for package A to see before this is built.
- The "14:00까지" of n13 and n15 is a Restaurant's own hours, which are ticket 16.

### Decisions (2026-11-15)

1. **The context.** `locationMissing` is `'permission'` while the permission is refused, blocked, or never asked; `'off-campus'` while the phone's position is outside the app's campus rectangle (the position is not sent); `null` on campus, before the first position, and while the permission is still being read. The server accepts the two values and null, refuses any other with 400, and reads an app that sends none as null. It uses the reason only when no location came.
2. **The origin rule** changes for the asker of a meal's plan only (`GatheringPerson.locationMissing`, set by `MealPlanService` for the asker): without a location and with a reason, they set out from the Place of their previous item of the day at any time, and the origin is marked `assumed`. A Friend keeps the 15-minute rule, and so do events, new Quests, and the library's seat arrival, which call `originOf` without the mark.
3. **n13's words** replace the first Plan's lines only; the other Plans keep theirs, and the candidates and their order are those of the same asker at that building. The first line says "직전 일정의" in place of "직전 수업의" when the previous item is a Quest's Sub Quest rather than a Class. Off campus a meal answer gets the same chip and lines (the decision's "either reason") but no "위치 켜기", since the location is on. The words live in `gathering/missing-inputs.ts`, reached through `MealAnswerArgs.missing`, since `meal-answer.ts` would pass the line limit.
4. **An answer's offers only open screens.** `AnswerReply.offers` is `Extract<RefusalOffer, { kind: 'open' }>[]` on both sides: the Plan's card has no way to send words without a line in `answer-frame.tsx` `Words`, which ticket 15 is changing, and no answer of this ticket asks in words. The app's check refuses an answer whose offer asks. On the app the new types are with row 8's other types in `api/refusal-types.ts`, and their check is in `api/server/missing-input-answers.ts`, the chip's in `api/server/chip-answers.ts`, and the Plan row's middle buttons in `answer/main-buttons.tsx`, since `assistant-types.ts`, `plan-answers.ts`, and `plan-card.tsx` would pass the line limit. On the server they sit likewise beside the refusal's in `refusals/refusal.dto.ts`, re-exported by `answer.dto.ts`.
5. **n15.** The server reads the asker's whole Timetable (`TimetableService.classesOf`), not the day. With no Class, the note and "시간표 넣기" come with any meal answer, Friends or not; the lines and the basis line only for the asker alone with a known origin, since only then does the longest meal mean the nearest. Those Plans are also sorted by the asker's walk (stable), so the words hold when a start fixed later gives every Plan the same minutes. Without a location as well, the order is not claimed and both offers show. The second line ("14:00까지 해요") is left out until ticket 16.
6. **n14.** The new words, the flag "08:45까지", the basis "지금 위치는 캠퍼스 밖이라 쓰지 않았어요", and no action belong to a walk from the gate in time for a deadline, from an off-campus position or from `locationMissing: 'off-campus'`. From the gate late, without a deadline, or by the shuttle, the Lookup is P01's, with P01's gate basis line. The note is on every Lookup from the gate. The leave-by notification's gate wording ("지금 정문을 지나면") could no longer be reached and was removed.
7. **The card.** A note is one muted line above the buttons (`answer/card-note.tsx`), in the Plan's card and the Lookup's card. The offers are secondary buttons in the Plan's row after "이대로 초대", filling the middle when there is no main button; they stay pressable while a recalculation is on its way. A marked chip has the Quest colour's border, ground, and label.
8. **The mock.** The two answers were printed once from `test/assistant-missing-inputs.integration.test.ts` (the scripted model calling `planMeal` on a Tuesday at 11:50) and kept as `mobile/src/api/mock/data/meal-answer-no-location.json` and `meal-answer-no-timetable.json`, with the date made 2026-11-17 and the asker's id that of `meal-answer.ts`; the replies' texts are sentences of the kind the rules ask for. With a context, "배고파" gets n13's copy when the context says `locationMissing: 'permission'` (a mock build with the location permission refused), else n15's when the mock's Timetable holds no Class (after 내 정보 → 시간표 is emptied), else the copy of before.
9. **A recalculation carries the reason too.** `POST /assistant/answers` takes `locationMissing` with the context's values and default, and passes it to the meal's plan as the chat does, so a correction of an n13 answer keeps the assumed origin. The app sends it from the same source as the context (`useMe`), through `Recalculation.locationMissing` in `use-shown-answer.ts` (`lastReply` untouched), and leaves the key out when it is null, so that a main server before this ticket, which refuses an unknown key, still recalculates. The mock ignores it.
10. **Not built here.** The map's words of n13 ("출발로 잡은 곳" at the building, "직전 수업 건물" on the pick's card) and a mock copy of n14 are not built; "여기로" is package D's.
11. **Review (2026-11-16): "이대로 초대" plans again with the reason.** The making body (`POST /plans` and `PUT /plans/:questId`, `planQuestSchema`) takes `locationMissing` like the recalculation, and `PlansService.replanned` passes it to the meal's plan, so that a Quest made from an n13 answer whose previous Class ended more than 15 minutes ago keeps the assumed origin and is not refused as `PLAN_CHANGED` again and again. `better-plan.service.ts` reaches `replanned` through the same body when a Quest is changed; its own better-plan reading has no reason to pass. The app sends the key only when it knows the reason, so a main server before this ticket still makes the Quest.
12. **Review (2026-11-16): no order is claimed with a Place fixed.** With `input.placeId` set, the Plans keep the gathering's order, and neither "…이 가장 가까워요" nor "시간표가 없어 가까운 순서로 넘겨 봐요" is said, since nearest was not what the User asked for; the note and "시간표 넣기" stay.


### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5), resumed for the recalculation and twice to rebuild it on #270 and then on `4.0/Main`. This session's review and the pull request are counted under P03 ticket 07.

- Agent time: about 113 minutes, an estimate from the transcript's timestamps; it includes waits for the Mac's shared check slots.
- Tokens: output 252,863; input 127,335,757, of which 126,279,072 were cache reads, 1,056,067 cache writes, and 618 uncached. Without cache reads: 1,309,548.
