# 03: The model's history holds what the User saw

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: an app OTA update and the main server.

## What happens now

- Whenever a reply draws an answer or a lookup, the app shows the server's lines and hides the model's text. Yet the history it sends with the next message (`messagesToSend` in `features/assistant/use-chat.ts`) holds that hidden text, not what was shown.
- The model's rules say to state facts only from the results its tools returned in this message. On the next turn it reads its own earlier text, finds no tool result behind it, and takes it back: "앞서 말씀드린 … 근거가 없어요", about sentences the User never saw.
- The server tells the model about "the plan on screen" from the conditions the app sent. A reply in words alone then replaces that plan on the screen, so "지금 화면의 일정은 내일 19:00 아워홈 저녁이에요" was said about a plan no longer drawn.

## What to build

- For a reply that drew an answer or a lookup, the history carries the words the User saw (the app already builds them for the copy of a turn) instead of the model's hidden text. A reply in words alone is sent as before.
- The model's rules say not to take back earlier replies for want of a tool result in this message, and to speak of the plan on screen only in a reply that keeps it there.

## Acceptance criteria

- [ ] A history with a drawn meal answer sends the answer's shown lines, not the model's text. (Unit test, fails before the fix.)
- [ ] A reply in words alone is sent with its text. (Unit test.)
- [ ] An evaluation case: after a drawn answer, a follow-up question does not get a reply that disowns the earlier answer.
- [ ] Lint, format and types of the app and the main server pass.

## Comments
