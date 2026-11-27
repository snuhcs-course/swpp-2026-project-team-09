# 29: The steps of several requests stand as the User changes them

Parent: [P10 spec](../spec.md); a review of several requests' corner cases (D2, D3, C4, C5), by reading `5.0/Main` at 331adc64e
Status: ready-for-agent

Native files: none. Releases: an app OTA update; no server change.

## What to build

A reply that answered a seat and a meal (P03) stands on the map as numbered steps (P04 ticket 09). Three app faults:

- **D2, D3: booking the seat drops the steps.** Pressing 예약하기, 예약 안 함 or 좌석 현황 adds the app's own bubble after the reply, and `shownStepsOf` then took the turn for one without steps. The meal left the map and the card, its 일정에 넣기 stayed as the main button, and the booked seat's 가는 길 and 예약 취소 were never reached.
  - The steps outlast the app's own bubbles, as `shownBookingOf` already keeps the booking with its done message.
  - The booked seat's step says "예약됨" and takes its ticket's act.
  - The card's sentence goes to the booking's own line, as a seat answer alone's does (the sentence slot, P01 ticket 20). The reply's words ("예약하기를 눌러야 예약이 돼요") no longer stay over the ticket.
  - The User can go on to the meal's step.
- **C4: the meal's step stays on the first Plan.** Another candidate, a band moved or "+ 같이" changes the Plan on screen, but the ② flag, its route and its span stayed on the reply's first restaurant and time. The answer's step follows the Plan on screen.
- **C5: the seat's step stays on the card's first time.** The time changed on the seat's card moves its flag line and span.

Keep it thin, an override where the steps are made: the main server is making steps carry their own answers, which replaces this.

## Acceptance criteria

- [x] The steps outlast a done message, 예약 안 함 and a card the app adds, and end with a new turn or another reply. (Unit test.)
- [x] The seat booked from the steps keeps both steps and the meal's card; its flag says "예약됨"; 가는 길 stands beside the input; ② gives the meal's button and ① the ticket's back. (Integration test.)
- [x] Booked from the steps, the reply's words give the card's sentence to the ticket, and the meal's card stays. (Integration test.)
- [x] Another candidate on the meal's step moves its flag and span. (Unit and integration tests.)
- [x] An answer with no Plan on screen makes the answer's step not done, with its reasons. (Unit test.)
- [x] The seat's time changed on its card moves its flag and span. (Unit and integration tests.)
- [ ] Pictures of the seat booked inside a steps reply, the meal still there and the right main button, at font scale 1.0 and 1.3. (In #706; the booked one to be taken again for the sentence.)
- [x] Whole lint, format and types.

## How it is built

- `shownStepsOf` (`features/assistant/steps-scene.ts`): the reply, then only the app's own bubbles (`own`).
- `liveStepsOf`: the steps as they stand now, over the reply's.
  - The answer's step, which the main server makes of the reply's first Plan (`answerStep`), is drawn at the Plan on screen once that is another: a candidate browsed, or an answer recalculated. With no Plan on screen it is not done, with the answer's reasons.
  - A booking's step is drawn at the time its card holds (`bookingKept`).
  - `useLiveSteps` in `chat-sheet.tsx` gives them to `control.steps`, which every reader takes: the bar's spans, the flags and their presses, the step due, the main button, and the reply's step lines (`BubbleSteps` in `answer-frame.tsx`).
- The step's button (`stepActionOf`): a booking's action, then its ticket's (`libraryActOf`), as one request's button takes them.
- The ticket's 가는 길 had no walk while the booking was one of several requests (`bookingWalk` in `chat-card-actions.tsx`). That held only while the steps went away on booking; now it has the walk there.
- The flag line of a booking made says its seat and "예약됨" (`stepLine`), as a lone booking's label does.
- **The sentence slot** (`sentence-slot.ts`): a reply whose words are its card keeps the card under a later bubble of its turn, but under the slot's holder (`holdsSlot`), so its sentence and its explaining line give way (`SlotHeld`, read by `Words` and `MealWords`). That is P01 ticket 20's own rule, and every answer kind takes it: also a group answer whose room was booked (P10 ticket 14).

## Comments

### Agent usage (2026-11-28)

- Agent time: about 45 minutes (an estimate), in one session: about 33 minutes from reading the review to the pull request (23:26 to 23:59 KST), then about 12 minutes on the emulator pictures, in a sitting shared with P10 ticket 15's.
- Tokens: input about 140 uncached, with cache reads about 40.4M and cache writes about 125k; output about 57k. No subagents.
