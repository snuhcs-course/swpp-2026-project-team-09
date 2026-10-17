# 01: Skeleton: the input bar opens the chat, and the Assistant answers menus and small talk

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

This ticket is the tracer bullet through every layer of the Assistant. A User presses the main screen's input bar and the chat opens over the map as the wireframe draws it (MainChat in the design canvas). They write "오늘 점심 뭐 나와?" and get today's lunch menus from the collected data, with the time they were collected, or a plain "there is none" when nothing was collected for that day. They can also chat casually: ask for a lunch recommendation and be asked what they feel like before getting a pick from today's menus. Long general work is declined politely. A question about where a Friend is gets pointed to the map.

On the server this ticket sets up everything the later tickets build on (ADR 0005):

- **The Assistant module in the main server.**
- **The model port.** The one place that talks to the model. It is bound to OpenRouter through the Vercel AI SDK in production and to a scripted fake in tests.
- **Configuration.** The OpenRouter key and the model name come from the environment.
- **The chat Assistant's feature definition.** Its own entry point, system prompt and set of tools.
- **The thin adapter.** It registers a feature's tools with the SDK and runs the loop.
- **The first refining tool, `getMenus`.**

Tools are a zod input schema plus a plain function calling existing services and do not import the SDK. Later features get their own feature definitions, never more tools on this one.

`getMenus` is the first example of the spec's central rule. The model passes the User's conditions (a date, optionally a meal and a restaurant). The tool returns only the menus matching them, each restaurant with when it was collected, or an explicit "none" with the reason. The system prompt forbids answering facts from anything but tool results.

## Acceptance criteria

- [ ] **The input bar opens the chat.**
  - It becomes a real field, and focusing it opens a translucent sheet over the map with the bottom tabs still visible.
  - The header shows the round chat icon, "SNU Now AI" and a close button.
- [ ] **The empty chat.**
  - It shows "무엇을 도와드릴까요?" and three example buttons: 식사 메뉴 추천, 현재 통학/순환 셔틀 위치, 파티 찾기.
  - Pressing one sends its words as the User's message.
- [ ] **The input and the bubbles.**
  - The input grows with its text up to the wireframe's limit, and Enter starts a new line.
  - The send button sends and is disabled while the input is empty.
  - The User's bubbles are on the right, the Assistant's on the left, and a "···" bubble shows while waiting.
- [ ] **The endpoint.**
  - The main server has one endpoint for signed-in Users that takes the conversation's messages and answers with the Assistant's reply text.
  - A request without a User's access token is refused.
  - The reply is shown whole, not streamed.
- [ ] **The model port.**
  - The model is reached only through the model port.
  - The production binding uses OpenRouter through the Vercel AI SDK, with the key and the model name from the environment.
  - Nothing else in the module depends on the SDK except the adapter.
- [ ] **The feature definition.**
  - The chat Assistant is a feature definition holding its system prompt and its tool set.
  - The module is shaped so that a later feature adds a definition rather than tools to this one.
- [ ] **The system prompt.** Every request's system prompt carries the current date, weekday and time in Korea. It states:
  - the role, in 해요체, answering in the User's language
  - to answer facts only from tool results and say plainly when a tool returned "none"
  - to keep answers short
  - to keep small talk short and decline long general work (reports, essays, code) politely
  - to point to the map for a Friend's location
  - that study spaces are not supported yet
- [ ] **`getMenus`.**
  - It takes a date and optionally a meal and a restaurant.
  - It returns only those menus, each restaurant with when it was collected.
  - When nothing matches it returns "none" with the reason, for example no menu collected for that date. It never returns another day's menus.
- [ ] **The scripted fake model.**
  - Server tests replace the model port with a scripted fake: per step, the tool to call with its arguments, or the text to answer.
  - The fake records what it received.
  - Its shape and how a test writes a script are recorded in the main server's README, since every later ticket uses it.
- [ ] **End-to-end tests through the endpoint with a real database**, as the existing end-to-end specs do:
  - a scripted `getMenus` call for a day with menus returns those menus and their collection time to the model
  - a day with none returns "none"
  - a meal filter returns that meal only
  - the system prompt the fake received carries the current Korean time
  - a request without an access token is refused
- [ ] **Screen tests with the existing fake server:**
  - pressing the input bar opens the sheet
  - an example button sends its words
  - a canned reply appears as the Assistant's bubble after "···"
  - the send button is disabled on empty input
- [ ] The app's mock client, used when no server is chosen, answers the endpoint as the other features' mock clients do.
