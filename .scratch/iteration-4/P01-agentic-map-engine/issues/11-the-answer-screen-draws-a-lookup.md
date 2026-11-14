# 11: The answer screen draws a Lookup

Parent: [P01 spec](../spec.md) ("The contract"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 06, and package B's pull requests 245 and 246 and its ticket 06 (the received invitation's card, which draws a scene without a Plan) on `4.0/Main`

## What to build

A reply with a Lookup is drawn in the answer frame the way a Plan is: the scene on the map between the pill and the card, and in the card the condition chips, the two lines, "근거" with the basis, the band when there is one, and the buttons. Ticket 06 makes the server send a Lookup; until this ticket the app shows only the model's sentence. The screen files are package B's (`mobile/src/screens/main/`, `mobile/src/map/`, `mobile/src/features/assistant/use-chat.ts`); B is named as their owner in the pull request.

## Acceptance criteria

- [x] A reply's Lookup reaches its bubble and the answer frame, which shows it as it shows a Plan's card: the chips (which do nothing when tapped), the lines, "근거" with the basis, and the band without handles.
- [x] The map draws the Lookup's scene with the same looks as a Plan's: the pick, the next item, the people, the routes and their flags. A shuttle stop, the shuttle's ride, the faded walk, and the flags for setting out, being late, and the shuttle each get a look of their own from the design system's tokens. A building-level face has a plain border.
- [x] The camera fits the Lookup as it fits a Plan, and closing the answer returns to the everyday map.
- [x] "길 안내" (`guide`) starts today's route guidance to the Place. A `remind` or `meet` action is not drawn until its screen exists (package D's notification, package B's "만나고 싶다").
- [x] Unit tests for the drawing of each scene kind; integration tests of the frame with a Lookup through the app's API mock (the copy of a real reply).

## Decisions (2026-11-15)

1. **Built after B's open pull requests are merged**, on top of them, so that their rework of the frame is not done twice. The scene is drawn with B's `drawingOfScene` (`mobile/src/features/assistant/answer-marks.ts`, P02 ticket 06), and the camera with B's one-scene version of `use-answer-map.ts`. The building card of row 6 is B's, built on this ticket.
2. **New roles get their looks here.** Until this ticket the app's drawing leaves a shuttle stop out and draws the new flags in the pick's tone. The looks of a stop, the shuttle's ride, the faded walk, and the flags for setting out, being late, and the shuttle are settled with package B in this ticket's pull request.
3. **No new screen piece**: the Lookup's card is the Plan's card without the arrows and without "이대로 초대".

## Comments

### Decisions taken in the build (2026-11-15)

1. **A shuttle stop** is a small dot in `color.svcShuttle` with a label of tone `stop`: the stop's name as the title ("301동 정류장") and the rest of its tag as the line in the shuttle's colour ("16:45 셔틀"); a tag that is the name alone gives no line. Its group comes after the next item and before the candidates in every order, its label tries left, right, below, and above, and it counts among the way's own points, so that the camera keeps the stop to walk to in view and an everyday Avatar beside it gives way, as beside a pick.
2. **The routes.** The ride between stops is `color.svcShuttle`, 4 pt; the walk not taken (`alt`) is `color.inkSubtle`, 2 pt, where it was `color.border`.
3. **The flags.** Setting out ("12:45 나서기") is a bold ink title on the surface, being late ("13:05 도착 · 5분 늦어요") `color.danger` on `color.dangerSoft`, the shuttle ("셔틀 · 신소재공동연구소 지남") `color.svcShuttle` on `color.svcShuttleSoft`; each takes a flag's sides. A place's flag away from the pick keeps the pick's tone, as before (board q4's "16:53 도착" at 58동, below it since 경영대 정류장 stands 39 m north).
4. **A building-level face** has the plain border B's drawing already gave every source but the Timetable; the unit test of board q6 pins it, with the label "지금 302동" under B's rule for a name of two characters.
5. **The pick's flag leaves out the name the title says**, by the same rule as a face's label: q1's flag "문화관(73동) · 걸어서 18분" is the line "걸어서 18분" under the title "문화관(73동)", and read aloud "문화관(73동) · 걸어서 18분". A Plan's flags ("12:15 점심") do not start with the name and are unchanged.
6. **"근거" opens on its own only for a way that is late**, a scene with a `late` flag (boards q3 and q7): the second line says "5분 늦어요", and the basis says why (the clock, the walk, and that the shuttle does not help), which is the User's next question. Every other Lookup opens with the basis closed, as a Plan's card does: its two lines are the answer, and q4's first line already says the shuttle is faster. The rule reads the scene, so any kind with a `late` flag opens.
7. **The main button is the first action the app draws.** Only `guide` is drawn ("길 안내"). A `remind` (q2, q4) and a `meet` (q6) are not drawn until package D's notification and package B's "만나고 싶다" exist, so q2 and q4 show "길 안내" and "닫기", and q6 "닫기" alone, across the card.
8. **"길 안내"** calls the main screen's route (`use-route.ts`, `routeTo`) as a card's "길찾기" does, and once the guidance started closes the answer, which forgets the conversation as ✕ does, so that the everyday map shows the route and says "…까지 길 안내". Without a position it says why as "길찾기" does, and the answer stays. `useMainLayers` makes the route before the chat, so that `useChatSheet` takes `routeTo` as `start`, and hands the route to the main screen, whose own function would otherwise pass lint's 50 lines.
9. **The Lookup on screen** is the last reply's, as the answer on screen is (`use-shown-lookup.ts`): the frame's card finds its bubble by it, an earlier bubble of the turn with a Lookup shows its two lines, and "근거" turns the basis of that reply only.
10. **The map** draws the Lookup with B's `drawingOfScene` and `useDrawnMap` (`use-lookup-map.ts`), so the camera is a Plan's. The everyday Friends' Avatars stay but for those the Lookup draws, unselected and with no "+", and nothing on the map takes a press: a Lookup is not recalculated. A Plan, when a reply has both, is drawn first.
11. **The band without handles** is B's `TimeBand` with `handles={false}`. A Lookup fixes no window, so no clash is marked.
12. **The chips** are B's `ReadOnlyChip`, a person's chip marked, wrapping as a Plan's chips do, with "근거" fixed at the right of the first line. The rule of equal cells on a grid is for a list of choices; a Lookup's card has none.
13. **`answer-marks.ts` under 300 lines.** B's move of `offset` and `metresBetween` into `answer-drawing.ts` (9876ba42) is cherry-picked as it is, and the groups with their orders, sides, route styles, and the flags' tones move into `answer-groups.ts`.
14. **Ticket 08's tests of the interim drawing** ("leaves the stop out", "the new flags in the pick tone" in `answer-marks-boundaries.unit.test.ts`) now expect the settled looks.

### Lines changed in package B's files

New code is in new files: `features/assistant/answer-groups.ts`, `features/assistant/use-shown-lookup.ts`, `screens/main/use-lookup-map.ts`, and `screens/main/answer/lookup-card.tsx`. `map-bottom.tsx`, `layout.ts`, and `use-room.ts` are not touched.

- `use-map-view.ts` (3 lines, as no other place holds the everyday Avatars the Lookup's map keeps): the import of `useLookupMap`; `const lookup = useLookupMap(chat.lookup, map, room, { avatars: things.avatars, cards });`; and `?? lookup` at the end of the line of `useAnswerMap`, so that a Plan goes first, then a Lookup, then a received invitation's way.
- `features/assistant/answer-marks.ts`: B's own move (9876ba42, cherry-picked); the groups, orders, sides, and route styles moved to `answer-groups.ts` (a prefactor commit of its own); the import of `FLAG_TONES`; `restOf`, split out of `faceTitle`, so that the pick's line leaves out the name (decision 5); `stopDraft`, which `placeDraft` calls where a stop returned null (decision 1); a flag's tone from `FLAG_TONES` (decision 3).
- `design-system/map-answer.tsx`: `stop` among a dot's roles and `stop`, `leave`, `late`, `shuttle` among a label's tones; the styles `stop`, `lateLabel`, `shuttleLabel`, `flagTitle`, `lateTitle`, `shuttleTitle`, `stopLine`, and the set `WAY_FLAGS`, with the five lines of the label that use them (decisions 1 and 3).
- `features/assistant/use-shown-answer.ts`: `lastReply` exported, so that the Lookup on screen is the same reply's.
- `screens/main/use-answer-map.ts`: `export` on `ANSWER_MIN_LEVEL`, `othersOf` (its signature now wraps), `EverydayAvatars`, and `useDrawnMap`, which `use-lookup-map.ts` uses.
- `screens/main/chat-sheet.tsx`: the import of `use-shown-lookup.ts`; `lookup: ShownLookup` in `ChatSheetControl`; the parameter `start` of `useChatSheet` and the line of its comment; `lookup: useShownLookup(…)` in what it returns.
- `screens/main/use-main-layers.ts`: `useRoute` called here, before `useChatSheet`, which takes `route.routeTo`; `me` in place of `me.position` as the parameter; `route` among what it returns, with its imports and the comment (decision 8).
- `screens/main/main-screen.tsx`: `route` taken from `useMainLayers`; `useLines` takes the route instead of making it; the import of `useRoute` dropped; and the screen's comment names a Lookup beside a Plan.
- `screens/main/answer/answer-frame.tsx`: the `lookup` prop of `Words`, passed from the control; the branch that draws `LookupCard` for the Lookup on screen; `?? lookup?.lines` for an earlier bubble; the imports and the comment.
- `screens/main/answer/time-band.tsx`: the prop `handles` (default true) and the two lines that leave the handles out (decision 11).

The tests were run on the build machine and pass: the new `answer-marks-lookup.unit.test.ts` (13), `design-system/map-answer-lookup.unit.test.tsx` (5), `answer-lookup.integration.test.tsx` (9), and `answer-lookup-late.integration.test.tsx` (2); the changed `answer-marks-boundaries.unit.test.ts`; and the frame's tests that cover the changed code (`answer-marks*`, `map-answer`, `map-native-scale`, `answer-map-hook`, `time-band` units, and `answer-frame`, `answer-map`, `answer-map-mock`, `answer-plan-card`, `answer-correct-band`, `invitation-card-answers`, `main-route`), with the app's lint, typecheck, and format. The screens on the emulator are still to be checked.
