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

- For a reply that drew an answer or a Lookup, the history carries the words the User saw: the steps the card listed (with the reason of one not done), then the answer's or the Lookup's lines. A reply in words alone is sent as before.
- The rules of an app that draws answers say not to take back an earlier reply for want of a tool result in this message, and to speak of the plan on screen only in a reply that calls planMeal.

## Acceptance criteria

- [x] A history with a drawn meal answer sends the answer's shown lines, not the model's text. (Unit test, fails before the fix.)
- [x] Steps come first, with the reason of one not done. (Unit test, fails before the fix.)
- [x] A reply in words alone is sent with its text. (Unit test.)
- [x] An evaluation case, `earlier-replies-not-taken-back`: after a drawn answer, "확실해?" does not get a reply that disowns it. (Loads; not run here, it calls the model.)
- [x] Lint, format and types of the app and the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 5 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 20k; input 12.0M, of which 11.9M cache reads, 49k cache writes and 84 uncached. No subagents.
