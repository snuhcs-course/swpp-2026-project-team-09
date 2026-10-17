# 02: The conversation kept, a new conversation, limits and failures

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

## What to build

A User closes the chat to glance at the map and opens it again to find the conversation where they left it. 새 대화 discards it and starts over. Restarting the app loses it. It is never stored on the server.

The app sends only the latest 20 messages. Each is a User's text, or the Assistant's text with the references of the cards it showed (kind and id). Earlier tool results are not sent, so a long conversation does not make every message more expensive. Ticket 06 adds the last Proposal's values to this shape.

The OpenRouter credit is a fixed $100, and any signed-in User can call the endpoint, so this ticket also protects the budget:
- each message's length and the request's total length are capped
- each User has a daily limit of messages, counted in Redis

When anything goes wrong, the User sees one ordinary failure and can try again. The server logs the cause, never what anyone wrote. Possible causes are a model error, the 30-second limit, the step limit reached without an answer, exhausted credit, or no key configured.

## Acceptance criteria

- [ ] **Keeping and discarding.**
  - Closing the sheet keeps the conversation in memory, and opening it again shows it.
  - Restarting the app starts an empty chat.
- [ ] The header has a 새 대화 button that discards the conversation and shows the empty state again.
- [ ] **What the app sends.**
  - The app sends at most the latest 20 messages, the oldest dropped.
  - The Assistant's earlier messages are sent as text and card references only.
  - The endpoint refuses a request whose messages do not have this shape.
- [ ] **Input size.**
  - The request schema caps each message's length and the request's total length.
  - A request over either is refused before the model is called.
  - The app keeps the User from typing past the message cap.
- [ ] **Daily limit.**
  - Each User has a daily limit of messages, counted in Redis, configurable with a default.
  - A message over the limit gets a reply saying today's messages are used up ("오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요"), without calling the model.
  - The count starts again each day in Korean time.
- [ ] **Limits per message.**
  - A message runs at most 8 model steps and 30 seconds, and the model's output is capped in tokens.
  - The values are configuration with these defaults.
- [ ] **Failures.**
  - These all answer one error reply: a model error, the timeout, the step cap reached without an answer, or exhausted credit.
  - The server logs the cause, and the reply does not reveal it.
- [ ] **Logs.** The server's logs never contain a User's message text or the model's answer, only causes and counts.
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
  - an over-long message is refused, and the fake is not called
  - the message after the daily limit (shortened in the test) gets the limit reply, and the fake is not called
  - a run's logs contain none of the message text
- [ ] **Screen tests:**
  - closing and reopening keeps the messages
  - 새 대화 empties the chat
  - a failure shows 다시 시도, which resends
  - the daily limit reply appears as the Assistant's bubble
