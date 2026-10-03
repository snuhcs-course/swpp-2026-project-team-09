# 10: Main screen: the AI input and the chat sheet

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Main screen: the map, the bottom navigation and my position)

## What to build

The main screen gains the AI input above the bottom navigation and the chat sheet it opens, as the frames `MainChat` and `MainChatSeats` show. The conversations are the frames' samples, held in the screen. No spec covers this feature, so nothing is sent to a server.

## Acceptance criteria

- [ ] The input sits where the frame puts it, and focus opens the chat sheet.
- [ ] The sheet shows the frame's starting state with its suggested questions.
- [ ] A suggested question, or a typed one, is answered with the frame's sample conversation for it.
- [ ] The sheet closes as in the frame, and the conversation starts again when the app restarts.
- [ ] A light Jest test: the sheet opens, a suggested question gets its sample answer, and the sheet closes.
