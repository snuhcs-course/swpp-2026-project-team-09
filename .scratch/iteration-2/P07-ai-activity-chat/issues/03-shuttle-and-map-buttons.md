# 03: The shuttle, and buttons that show it on the map

Parent: [P07 spec](../spec.md)
Status: ready-for-human
Blocked by: 01

## What to build

A User asks "셔틀 어디 있어?" and gets the vehicles the operator reports now, or is told the shuttle is not running. Under the answer, 지도에서 셔틀 보기 closes the sheet and turns the map's shuttle layer on. A menu answer gets 지도에서 식당 보기 the same way, with the dining layer.

This ticket adds the first presenter. A presenter is a tool through which the model puts something real into the reply, rather than describing it in prose.

P06-07 (#81) changes the main screen's Quest list in the same screen this ticket changes. Whichever lands second rebases over the other.

## Acceptance criteria

- [x] **`getShuttle`.**
  - It returns the vehicles the operator reports now, with when they were collected.
  - When the shuttle is not running, or nothing recent was collected, it returns "none" with the reason. The model then says so instead of guessing.
- [x] `showOnMap` takes `dining` or `shuttle` and adds that map button to the reply. The reply's contract carries map buttons beside the text.
- [x] The chat Assistant's tool set includes both tools.
- [x] **The map buttons in the app.**
  - They appear under the Assistant's bubble: 지도에서 셔틀 보기 for `shuttle`, 지도에서 식당 보기 for `dining`.
  - Pressing one closes the sheet and turns that layer on, using the map's existing layers.
- [x] **End-to-end tests with the scripted fake:**
  - `getShuttle` returns the reported vehicles
  - `getShuttle` returns "none" when the shuttle is not running
  - `showOnMap` puts the button in the reply
  - an unknown layer is refused back to the model
- [x] **Screen tests:** a reply with a map button shows it, and pressing it closes the sheet with the layer on.

## Comments

### Result (2026-10-18)

Where things are:

- Server: `main-server/src/assistant/`.
  - `tools/get-shuttle.ts` reads the set of vehicles the worker stored last, through `ShuttleService.reportedVehicles()`, which `ShuttleModule` now exports. It answers `{ result: 'found', collectedAt, vehicles: [{ vehicle, stop }] }`, with the vehicles in the loop order of their stops. It answers "none" with one of two reasons: the operator reports no vehicle (an empty set), or no set was stored in the last minute (the Redis key has expired).
  - `tools/show-on-map.ts` is the first presenter. It takes `layer: 'dining' | 'shuttle'` and adds that layer to the run's `presented.mapButtons`, each layer once, in the order first shown.
  - `feature.ts` adds `MAP_LAYERS`, `Presented` and `FeatureReply`. `ToolContext` is now `Asker` (`userId`, `now`) plus `presented`.
  - `runFeature` takes the `Asker`, builds the context for each run, and answers `{ text, mapButtons }`. The limits, `NoAnswerError` and `causeOf` are unchanged.
  - The reply is `AssistantReplyDto { text, mapButtons }`. `mapButtons` is always present, `[]` when there are none.
  - The system prompt tells the model to call `showOnMap` after an answer about menus or the shuttle.
- Server tests:
  - `showOnMap` is tested in `test/assistant.e2e-spec.ts`: the button reaches the reply, a layer shown twice gets one button, and an unknown layer goes back to the model as the SDK's input error with no button.
  - `getShuttle` is tested in `test/shuttle.e2e-spec.ts`: vehicles found, the operator reporting none, and nothing collected in the last minute. The vehicles are one Redis key that every test file shares, and that file is the only one that sends shuttle messages, so the tests live there.
- App:
  - `AssistantReply` and `MapLayer` are in `src/api/assistant-types.ts`. The client's guard checks `mapButtons`.
  - `ChatBubble.mapButtons` is in `use-chat.ts`. `messagesToSend` leaves it out.
  - The buttons are drawn in `Bubble` (`chat-bubbles.tsx`), only when `failure === null`.
  - `useChatSheet(inFront, turnOn)` closes the sheet and calls the new `LayerStack.turnOn` (`layers.tsx`). Unlike the toggles, it leaves a layer that is already on as it is.
  - The mock Assistant answers a shuttle question with the shuttle button, and a menu question with the dining button.
  - The tests are in `__tests__/chat-map-buttons-test.tsx`, a new file because `main-chat-test.tsx` is near the 300-line cap.

Decisions:

- The contract is a list of layer names, `"mapButtons": ["shuttle"]`, not objects. The app owns the wording (지도에서 셔틀 보기, 지도에서 식당 보기) and the icons.
- `getShuttle` does not give the model the route's service hours. They are text collected from the operator's page, and the wrapping of collected text in delimiters is not built yet. The "nothing collected" reason says that positions are collected only on weekdays in the service hours, so the model can say the shuttle is not running.
- The map buttons sit inside the Assistant's bubble, under the text, as 다시 시도 does.

Not checked or not confirmed:

- Nothing ran against a real model or on a phone. Whether a real model calls `showOnMap` reliably after a menu or shuttle answer is left to P19.
- `tsc` in `mobile/` still reports the two typed-route errors in `menus-screen-test.tsx` and `support/party.ts`.
- Tests:
  - The full main-server suite passes: 111 files, 1,465 tests.
  - The full app suite, run with 3 workers, failed 9 of 115 suites (52 tests), each taking 100 to 255 seconds while the machine was under load. The failures were test timeouts and main-screen or tab elements that had not appeared yet, and none were in the chat. Run again alone with one worker, all 9 pass (99 tests): `profile-edit`, `party-mine`, `room-typed-place`, `room-activation`, `position-sending`, `shuttle-vehicles`, `dining-layer`, `events-recruiting` and `events-matching`.
  - `chat-map-buttons-test.tsx` (5 tests) and `main-chat-test.tsx` (16 tests) pass.

### Agent usage (2026-10-18)

- Agent time: about 30 minutes in one session, no subagents, much of it waiting on the test suites (an estimate).
- Tokens: about 8.3M input, of which 8.2M were cache reads, 158k cache writes and under 1k uncached; and 44k output. They come from the session's transcript and leave out the final commit step.
