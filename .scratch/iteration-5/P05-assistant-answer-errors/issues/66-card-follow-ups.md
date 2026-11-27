# 66: A question about a card on screen gets one short sentence, in the app's words

Parent: [P05 spec](../spec.md). On the user's phone (2026-11-27), a 관정 seat card was on screen, its room switched in the card to 8층 정숙 열람실. "거기 몇 층이야?" was answered "관정도서관 8층이에요. 지금 카드에 있는 8A 열람실 1 구역(QUIET ZONE)은 조용히 공부하는 정숙 열람 구역이에요. 예약하기를 눌러야 예약되고, 카드에 로그인이 보이면 먼저 로그인해 주세요."
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server. The prompt changes for every app: the library rules shared by the text chat, and the rules for an app that draws answers.

## What happened

Read from the code; nothing was sent to the library or to Production.
- **Length.** No rule covered a question about a card already on screen. The two rules that ask for a sentence about pressing 예약하기 and signing in said "when a card is shown", and the model read the card on screen as one.
- **The raw name.** `[Cards shown: …]` names the card's space by `roomLabelOf`. Its pattern for the part in brackets needs a space before the bracket, so "8A 열람실 1 구역(QUIET ZONE)" went to the model whole. The book and seats summaries, findLibrarySpace's answers and the seat-stay Quest's title (in `[Ahead: …]`) gave the catalogue's names too. The app calls the space 8층 정숙 열람실.
- **The card named.** `SIGN_IN_FIRST` said "카드에 로그인이 보이면…", and two other tool answers said "카드에서", while the rules forbid naming the card.

## What changes

| Fault | Where | Change |
| --- | --- | --- |
| Raw name | `[Cards shown: …]` (`run-messages.ts`) | The app's title: "library card for 관정 8층 정숙 열람실, …" |
| Raw name | The book card's summary, the seats card's summary | The app's name of a seat space, with its floor (`app-names.ts`, a copy of the app's `seat-rooms.ts` that a test compares) |
| Raw name | findLibrarySpace's `found` and `several` names | The app's name for a seat space; any other space keeps the catalogue's |
| Raw name | Refusals: closed on Sunday, not a seat of the space, no free gap (`booking-rules.ts`, `find-library-free-slots.ts`) | The app's name for a seat space |
| Raw name | The seat-stay Quest's title, read in `[Ahead: …]` | "관정 8층 정숙 열람실" |
| Raw name | The answer rules' example "7층 7A 열람실 2 구역 …" | "7층 열람실 …" |
| Raw name | The answer rules | A new line: a seat space is called as the tools and `[Cards shown: …]` name it, never by the sector's name |
| Instruction echoed | "When a card is shown, say … 예약하기" (every app) | "When a tool of this message shows a card" |
| Instruction echoed | "with 예약하기, also say that they sign in first" (answer apps) | "with 예약하기 for a card shown in this message" |
| Card named | `SIGN_IN_FIRST` | "로그인이 보이면 관정도서관에 먼저 로그인해요." |
| Card named | "사용 용도는 카드에서 골라요.", "…카드에서 끝 시간을 당겨요" | "사용 용도는 예약하기 전에 골라요.", "…끝 시간을 당겨요" |
| Length | Every app's library rules | A new line for a question about a card on screen (below) |
| Length | The meal plan rules | A new line for a question about the plan on screen (below) |

Each follow-up on a card on screen, and its reply:

| Asked | Reply |
| --- | --- |
| 거기 몇 층이야? | From `[Cards shown]`, no tool: "8층이에요." |
| 무슨 방이야? | "8층 정숙 열람실이에요." |
| 몇 시까지야? / 몇 번 자리야? | "13:30까지예요." / "8001번이에요." |
| 거기 어디야? | The building and floor: "관정도서관 8층이에요." |
| 몇 시에 닫아? | findLibrarySpace, then its hours alone: "23:00까지 열어요." |
| 거기서 밥 먹어도 돼? / 콘센트 있어? | The catalogue says nothing of it: "음식은 확인되지 않아요." |
| 몇 자리 남았어? | Unchanged. An app that draws answers asks it as the seat (P05 ticket 61), and the card shows the free seats; the text chat calls showLibrarySeats. |
| 어떻게 가? | Unchanged: findWay. |

None of these replies names the card, says what pressing does or says to sign in.

Each follow-up on a meal plan on screen, and its reply:

| Asked | Reply |
| --- | --- |
| 거기 어디야? | From `[Plan on screen]`, no tool: "301동식당이에요." |
| 거기 몇 시까지 해? | restaurantHours, the meal on screen alone: "14:00까지 해요." (its rule said one or two sentences) |
| 얼마야? | Unchanged: a price is only as planMeal gives it. |
| 몇 분 걸려? | Unchanged: the reply never gives minutes on the way, which the app shows. |
| 12:30까지만 | Unchanged: one sentence of what changed. |

The eval's text checks gain `maxChars`, the most characters a reply may have.

## Not changed

- The catalogue in findLibrarySpace's description keeps the library's names. The text chat asks among them by name, and the frozen P6 suite's ASK cases expect those names.
- A room (group study room, media room) keeps the catalogue's name, as in "(24 rooms)". So do the step titles of a message with several requests, which the app shows and the model does not read.
- The press words of a card shown in the same message are unchanged: "예약 취소를 눌러야 취소돼요", "반납하기를 눌러야 반납돼요", "…아래에 나와요".

## Acceptance criteria

- [x] The rules of every app answer a question about a card on screen in one short sentence with no tool, and tie the press and sign-in words to a card shown in this message. The text chat's fixture holds the shared lines. (Unit test, failing before the change.)
- [x] The answer rules name a seat space as the app does. (Unit test.)
- [x] `[Cards shown: …]`, the summaries, findLibrarySpace's names, the refusals and the seat-stay title give the app's names. (Integration tests, failing before the change.)
- [x] The app's names equal those of `mobile/src/library/cards/seat-rooms.ts`. (Unit test.)
- [x] The meal plan rules answer a question about the plan on screen in one short sentence. (Unit test.)
- [x] `text.maxChars` fails a longer reply. (Unit test.)
- [x] Eval cases: five follow-ups on a card and one on a meal plan, and the changed-card case without the sector's name. Written, not run: no model key on this machine.
- [x] The whole of the main server's lint, format and types; the touched test files run locally.
