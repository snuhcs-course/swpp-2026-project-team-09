# 10: Earlier questions in the pill, and a new conversation that forgets nothing

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-time-bar-on-top.md) for the top's layout.

Native files: none. Releases: an app OTA update only.

## What to build

The pill shows the number of turns of the conversation on screen beside the question (board 9). A tap on the pill opens a list under it (board 16): the first row "새 대화" ("지금 대화는 지워지지 않고 아래에 남아요"), then every question of this session's conversations, latest first, each with the time it was asked and its outcome in a few words ("학생회관식당 12:33 · 초대 2명 보냄", "7233번 · 14:00–16:30 예약함", "아직 만들지 않음"). A tap on a row brings that answer back to the map. "새 대화" keeps the current conversation in the list and starts an empty one, with the input focused.

## What happens now

- "새 대화" is an icon beside the pill; it forgets the conversation, with 되돌리기 for five seconds.
- "지난 답 N개" under the card opens earlier turns of the same conversation as read-only text.
- Conversations are lost on restart (this stays).

## What changes

- The chat keeps a list of earlier conversations in memory; "새 대화" moves the current one there. The toast and 되돌리기 go.
- The pill's count, its list, and the outcome words of a turn (one function, unit tested).
- A row of the current conversation shows that turn's reply on the map as it was replied: its first Plan, Lookup, or cards. A row of an earlier conversation makes it the current one. The next message continues the current conversation from its latest turn, as today.
- "지난 답 N개" goes.

## Must not break

- What a request sends of the conversation (`messagesToSend`): the current conversation only.
- A reply on its way when "새 대화" is pressed is stopped, as reset does today.
- The kept conversation and its unseen dot (`answer-conversation-kept`, `answer-unseen-and-undo`, rewritten for the list).

## Acceptance criteria

- [ ] After three questions, the pill shows 3; its list shows 새 대화 and the three questions with times and outcomes, latest first. (Integration test.)
- [ ] A tap on the first question's row draws its Plan on the map again. (Integration test.)
- [ ] "새 대화" empties the frame, focuses the input, and the old questions stay in the list; a tap on one brings that conversation back. (Integration test.)
- [ ] A message after "새 대화" sends none of the old conversation. (Integration test.)
- [ ] The outcome words for a Plan sent, a Plan not made, a booking, and words. (Unit test.)
- [ ] The list on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
