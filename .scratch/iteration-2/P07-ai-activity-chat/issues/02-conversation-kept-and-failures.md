# 02: The conversation kept, a new conversation, and failures

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

## What to build

A User closes the chat to glance at the map and opens it again to find the conversation where they left it. 새 대화 discards it and starts over. Restarting the app loses it. It is never stored on the server.

The app sends only the latest 20 messages. Each is a User's text, or the Assistant's text with the references of the cards it showed (kind and id). Earlier tool results are not sent, so a long conversation does not make every message more expensive.

When anything goes wrong, the User sees one ordinary failure and can try again. The server logs the cause. Possible causes are a model error, the 30-second limit, the step limit reached without an answer, exhausted credit, or no key configured. The limits keep a loop or a slow model from burning the $100 budget or hanging the chat.

## Acceptance criteria

- [ ] **Keeping and discarding.**
  - Closing the sheet keeps the conversation in memory, and opening it again shows it.
  - Restarting the app starts an empty chat.
- [ ] The header has a 새 대화 button that discards the conversation and shows the empty state again.
- [ ] **What the app sends.**
  - The app sends at most the latest 20 messages, the oldest dropped.
  - The Assistant's earlier messages are sent as text and card references only.
  - The endpoint refuses a request whose messages do not have this shape.
- [ ] **Limits per message.**
  - A message runs at most 8 model steps and 30 seconds, and the model's output is capped in tokens.
  - The values are configuration with these defaults.
- [ ] **Failures.**
  - These all answer one error reply: a model error, the timeout, the step cap reached without an answer, or exhausted credit.
  - The server logs the cause, and the reply does not reveal it.
- [ ] With no OpenRouter key configured, the main server starts and serves everything else, and the endpoint answers the error reply.
- [ ] **What the app shows on a failure.**
  - The error reply appears as the Assistant's bubble "지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요" with a 다시 시도 button.
  - 다시 시도 sends the same message again.
- [ ] Nothing about a conversation is stored on the server.
- [ ] **End-to-end tests with the scripted fake:**
  - a script that never answers stops at the step cap with the error reply
  - a fake that stalls past the time limit gets the error reply (the limit shortened in the test)
  - a fake that throws gets the error reply
  - no key gives the error reply
  - 25 messages sent reach the model as the latest 20, without earlier tool results
- [ ] **Screen tests:**
  - closing and reopening keeps the messages
  - 새 대화 empties the chat
  - a failure shows 다시 시도, which resends
