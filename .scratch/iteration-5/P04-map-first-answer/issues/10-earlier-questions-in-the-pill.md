# 10: Earlier questions in the pill, and a new conversation that forgets nothing

Parent: [P04 spec](../spec.md)
Status: in-progress
Blocked by: [01](01-time-bar-on-top.md) for the top's layout.

Native files: none. Releases: an app OTA update only.

## What to build

The pill shows the number of turns of the conversation on screen beside the question (board 9). A tap on the pill opens a list under it (board 16): the first row "새 대화" ("지금 대화는 지워지지 않고 아래에 남아요"), then every question of this session's conversations, latest first, each with the time it was asked and its outcome in a few words ("학생회관식당 12:33 · 초대 2명 보냄", "7233번 · 14:00–16:30 예약함", "아직 만들지 않음"). A tap on a row brings that answer back to the map.

Every answer has a labelled "＋ 새 대화" button at its top right, beside the pill (boards 24 to 27). One press closes the answer, keeps the conversation in the list, and shows the map screen with an empty, focused input and a chip "지난 대화 N ▾" above it that opens the list (board 27). Nothing is erased. The list's own "새 대화" row does the same.

## What happens now

- "새 대화" is an icon beside the pill; it erases the conversation, with the toast "대화를 지웠어요" and 되돌리기 for five seconds.
- "지난 답 N개" under the card opens earlier turns of the same conversation as read-only text.
- Conversations are lost on restart (this stays).
- The user said that leaving the answer for the map screen "does not seem to work well": ✕ and back are checked in every state of the answer here.

## What changes

- The chat keeps a list of earlier conversations in memory; "새 대화" moves the current one there. The toast and 되돌리기 go.
- The icon beside the pill becomes the labelled "＋ 새 대화" button at the answer's top right.
- The map screen after "새 대화": the input empty and focused, its placeholder "새로 물어보기 · 예: 공부할 자리", and the chip "지난 대화 N ▾" (N the kept conversations), whose press opens the list over the map.
- The pill's count, its list, and the outcome words of a turn (one function, unit tested).
- A row of the current conversation shows that turn's reply on the map as it was replied: its first Plan, Lookup, or cards. A row of an earlier conversation makes it the current one. The next message continues the current conversation from its latest turn, as today.
- "지난 답 N개" goes.
- ✕ and back close the answer whatever its state (the card raised, the keyboard up, a list open); a state where they do not is a bug fixed here.

## Must not break

- What a request sends of the conversation (`messagesToSend`): the current conversation only.
- A reply on its way when "새 대화" is pressed is stopped, as reset does today.
- The kept conversation and its unseen dot (`answer-conversation-kept`, `answer-unseen-and-undo`, rewritten for the list).

## Decided while building (2026-11-22)

- ✕ closes the answer in every state (the card raised, the keyboard up, the list open). Back takes away one layer per press: the keyboard (Android's own), the list, a mark's card, the raised card, then the answer; ticket 12 keeps back lowering a raised card first.
- Each row reads "{what} · {outcome}": a Plan sent "학생회관식당 12:33 · 초대 2명 보냄" (the number only, never the Friends' names), taken alone "· 혼자 가기로 함", not made "· 아직 만들지 않음"; a booking "7233번 · 14:00–16:30 예약함"; a Proposal "· 만듦" or "· 아직 만들지 않음"; otherwise the reply's first line, "답을 가져오지 못함", or "답을 기다리는 중". A Quest already set changed by 바꾸기 reads "· 바꿈" and 그대로 두기 "· 그대로 둠"; their words are in place for P04 tickets 17 and 20 to record.
- The list is flat across conversations, latest first, under board 16's header; the turn on screen is marked 지금 (board 9). The list from "지난 대화 N ▾" is the same card standing on the chip, without the 새 대화 row, closed by a press outside or by back.
- 새 대화, or an earlier conversation's row, while a reply is on its way drops that question, as 새 대화 did. A row of the current conversation shows that turn; a reply that arrives while the User is still in that conversation takes the screen to the latest turn.
- "지난 대화 N ▾" stands at the left with the made Quest's line while the keyboard is down, and just over the input, under the examples, while it is up; ticket 11 moves it.
- A docked answer with nothing to read, such as a way to a Place, stays docked as board 10 draws it, with no handle: "지난 답 N개" was the only way to raise it. Its basis is reached by its flag, which opens what "근거 ›" opened (P04's small fixes).

## Acceptance criteria

- [x] After three questions, the pill shows 3; its list shows 새 대화 and the three questions with times and outcomes, latest first. (Integration test.)
- [x] A tap on the first question's row draws its Plan on the map again. (Integration test.)
- [x] "＋ 새 대화" closes the answer and shows the map screen with an empty, focused input and "지난 대화 1 ▾"; the chip opens the list, and a tap on the old question brings that conversation back. (Integration test.)
- [x] A message after "새 대화" sends none of the old conversation. (Integration test.)
- [x] ✕ and back close the answer with the card raised and with the keyboard up. (Integration test.)
- [x] The outcome words for a Plan sent, a Plan not made, a booking, and words. (Unit test.)
- [x] The button, the map screen after it, and the list on a phone with the mock build. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.
