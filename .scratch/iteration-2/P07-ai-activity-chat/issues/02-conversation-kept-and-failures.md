# 02: The conversation kept, a new conversation, limits and failures

Parent: [P07 spec](../spec.md)
Status: ready-for-human
Blocked by: 01

## What to build

A User closes the chat to glance at the map and opens it again to find the conversation where they left it. 새 대화 discards it and starts over. Restarting the app loses it. It is never stored on the server.

The app sends only the latest 20 messages. Each is a User's text, or the Assistant's text with the references of the cards it showed (kind and id). Earlier tool results are not sent, so a long conversation does not make every message more expensive. Ticket 06 adds the last Proposal's values to this shape.

The OpenRouter credit is a fixed $100, and any signed-in User can call the endpoint, so this ticket also protects the budget:

- each message's length and the request's total length are capped
- each User has a daily limit of messages, counted in Redis

When anything goes wrong, the User sees one ordinary failure and can try again. The server logs the cause, never what anyone wrote. Possible causes are a model error, the 30-second limit, the step limit reached without an answer, exhausted credit, or no key configured.

## Acceptance criteria

- [x] **Keeping and discarding.**
  - Closing the sheet keeps the conversation in memory, and opening it again shows it.
  - Restarting the app starts an empty chat.
- [x] The header has a 새 대화 button that discards the conversation and shows the empty state again.
- [x] **What the app sends.**
  - The app sends at most the latest 20 messages, the oldest dropped.
  - The Assistant's earlier messages are sent as text and card references only.
  - The endpoint refuses a request whose messages do not have this shape.
- [x] **Input size.**
  - The request schema caps each message's length and the request's total length.
  - A request over either is refused before the model is called.
  - The app keeps the User from typing past the message cap.
- [x] **Daily limit.**
  - Each User has a daily limit of messages, counted in Redis, configurable with a default.
  - A message over the limit gets a reply saying today's messages are used up ("오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요"), without calling the model.
  - The count starts again each day in Korean time.
- [x] **Limits per message.**
  - A message runs at most 8 model steps and 30 seconds, and the model's output is capped in tokens.
  - The values are configuration with these defaults.
- [x] **Failures.**
  - These all answer one error reply: a model error, the timeout, the step cap reached without an answer, or exhausted credit.
  - The server logs the cause, and the reply does not reveal it.
- [x] **Logs.** The server's logs never contain a User's message text or the model's answer, only causes and counts.
- [x] With no OpenRouter key configured, the main server starts and serves everything else, and the endpoint answers the error reply.
- [x] **What the app shows on a failure.**
  - The error reply appears as the Assistant's bubble "지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요" with a 다시 시도 button.
  - 다시 시도 sends the same message again.
- [x] Nothing about a conversation is stored on the server.
- [x] **End-to-end tests with the scripted fake:**
  - a script that never answers stops at the step cap with the error reply
  - a fake that stalls past the time limit gets the error reply (the limit shortened in the test)
  - a fake that throws gets the error reply
  - no key gives the error reply
  - 25 messages sent reach the model as the latest 20, without earlier tool results
  - an over-long message is refused, and the fake is not called
  - the message after the daily limit (shortened in the test) gets the limit reply, and the fake is not called
  - a run's logs contain none of the message text
- [x] **Screen tests:**
  - closing and reopening keeps the messages
  - 새 대화 empties the chat
  - a failure shows 다시 시도, which resends
  - the daily limit reply appears as the Assistant's bubble

## Comments

### Handed over from 01 (2026-10-18)

01 (#84) already does part of this ticket. Build on it rather than adding a second version:

- **The conversation kept.** `useChat()` (`mobile/src/features/assistant/use-chat.ts`) lives in `MapBottom` through `useChatSheet`, so closing the sheet already keeps the conversation. Still to do here: 새 대화 and the test for closing and reopening.
- **The request's shape.** `assistantMessagesSchema` (`main-server/src/assistant/dto/assistant-messages.dto.ts`) answers 400 before the model is called when a conversation is empty or does not end with the User's message. Extend that schema with the card references and the length caps.
- **The failure bubble.**
  - `use-chat.ts` already shows this ticket's wording, "지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요", as a plain bubble.
  - The bubble is marked `failed` and left out of the next request.
  - Still to do here: 다시 시도, which sends the same message again, and the server's error reply.
- **Limits per message.**
  - `MAX_STEPS = 8` is a constant in `main-server/src/assistant/adapter.ts`.
  - Model calls are not retried: `MAX_RETRIES = 0`, set after the review of #84, because each retry is another billed call and more waiting.
  - Still to do here: make the steps, the 30 seconds and the output token cap configuration, and keep any retry inside the 30 seconds.

From the review of #84, which this ticket must also settle:

- **No key yet on a reachable server.** Until these limits exist, the main server's README ("Assistant") says to set `OPENROUTER_API_KEY` only on your own machine. Reword that line once the caps, the timeout and the daily limit are in.
- **No key configured.**
  - Today the endpoint answers 500: an OpenRouter model is still built from the empty settings.
  - `main-server/.env.example` already says the Assistant "answers that it is unavailable". Make that true with the error reply, and update the README's "the endpoint then answers 500".
- **Error logs.**
  - A model error reaches Nest's default exception handler with the AI SDK's message and stack.
  - The SDK's `APICallError` can carry the request it sent, which holds the User's messages, and `RetryError` wraps such errors.
  - Catch them in the service and log only the cause, such as the error's name and the HTTP status, never its message or body.
  - The test "a run's logs contain none of the message text" should include a model that fails this way.

### Result (2026-10-18)

Where things are:

- Server: `main-server/src/assistant/`.
  - `dto/assistant-messages.dto.ts` is the request's shape: the User's `{ role, text }` or the Assistant's `{ role, text, cards }`, where a card is `{ kind: 'quest' | 'globalEvent', id }`. It caps a User's message at 1,000 characters, an Assistant's at 4,000 and all of them at 24,000.
  - `assistant.service.ts` answers 503 without a key, counts each User's messages of the day in Korea in Redis (`assistant:messages:<userId>:<date>`, 429 past `ASSISTANT_DAILY_MESSAGES`), gives the model the latest 20 messages, and turns every failure into the 503 reply.
  - `adapter.ts` runs the loop within `ASSISTANT_MAX_STEPS`, `ASSISTANT_TIMEOUT_MS` and `ASSISTANT_MAX_OUTPUT_TOKENS` (8, 30,000, 1,000 by default; `common/settings.ts`). It throws `NoAnswerError` when the steps run out on tools, and `causeOf` names a failure for the log: the error's name, and the HTTP status of an `APICallError`, also inside a `RetryError`.
- Server tests: `main-server/test/assistant-limits.e2e-spec.ts`. `ScriptedModel` has two more steps, `{ error }` and `{ stall: true }`.
- App: `useChat()` (`mobile/src/features/assistant/use-chat.ts`) has `retry` and `reset` and `messagesToSend`. The header's 새 대화 is in `chat-sheet.tsx`, and 다시 시도 is in `chat-bubbles.tsx`. The tests are in `__tests__/main-chat-test.tsx`.

Decisions:

- **Status codes.**
  - The daily limit is a 429, and every other failure is one 503 `{ "message": "The Assistant cannot answer now" }`.
  - The Korean wording lives in the app. It shows the 429 as the bubble "오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요" without 다시 시도, and any other failure as "지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요" with 다시 시도.
  - Neither bubble is sent back to the Assistant.
- **Trimming.** The server keeps the latest 20 messages of any request within the caps, so a request of 25 is answered, not refused. The app sends at most 20 as well, and drops its oldest while they hold more than 24,000 characters, so that a long conversation is never refused.
- **The no-key check.** The service checks `OPENROUTER_API_KEY` itself, so the test runs the real check with the scripted model bound.
- **The daily count.**
  - The count is made before the model is called, after the request passes its shape, so a refused request does not count and a failed one does.
  - It reads the clock of `QuestsModule` (`CLOCK`), so the test moves the day.
- **The time limit.** It is the AI SDK's `timeout.totalMs` over the whole message. Retries stay off (`MAX_RETRIES = 0`), and any retry would fall within it anyway.
- **다시 시도.** It removes the failure bubble and sends the conversation again, ending with the same message of the User's. It shows only while the failure is the last bubble.
- **README.** The main server's README no longer says to set the key only on your own machine. It now says to give each key a credit limit on OpenRouter as well, since the daily limit bounds one User's spending, not everyone's.

Not checked or not confirmed:

- Nothing ran against a real model or on a phone. Whether OpenRouter's provider honours the abort when the time runs out is not tested. The fake stalls until it is aborted, as a `fetch` with the signal would.
- `tsc` in `mobile/` still reports the two typed-route errors in `menus-screen-test.tsx` and `support/party.ts` that 01 noted.
- Tests:
  - The full main-server suite passes: 111 files, 1,459 tests.
  - The full app suite run with 3 workers failed 13 suites that each took 70 to 385 seconds while the machine was under load. Run again, all 13 pass.
  - `main-chat-test.tsx` passes, 16 tests.

### Agent usage (2026-10-18)

- Agent time: about 45 minutes in one session, no subagents, much of it waiting on the test suites (an estimate).
- Tokens: about 12.6M input, of which 12.4M were cache reads, 173k cache writes and under 1k uncached; and 63k output. They come from the session's transcript and leave out the final commit step.
