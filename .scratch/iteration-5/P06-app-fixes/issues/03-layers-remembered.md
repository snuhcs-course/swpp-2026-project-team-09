# 03: The map's three layers stay as the User left them, across a restart

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-lists-go-quest-chip-opens-quests.md), which removes the lists (only the three layers are left to remember) and changes the same main screen.

Native files: none. Releases: an app OTA update only.

## What happens now

Received: "현재 앱은 껐다키면 친구/퀘스트 리스트는 펼쳐져있고, 공부공간/셔틀버스/식당은 꺼져있는게 기본. 앱을 종료하더라도(백그라운드가 아니라 아예) 이 다섯개의 on/off 정보는 기억을 하고 다시 켰을 때 마지막 상태를 가져왔으면 좋겠음" (`references/03-1-layers-on.webp`: 공부공간 and 셔틀버스 on, 식당 off). After ticket 01 the lists are gone, so the three layers are what is left.

- `useLayerStack` (`mobile/src/screens/main/layers.tsx:39-67`) keeps the layers in `useState({ dining: false, shuttle: false, study: false })` (:41); the comment at :18-19 says they start off when the app starts. `use-main-layers.ts:121-124` reads them (the shuttle is fetched only while its layer is on).
- `turnOn` (:45) is also called by the chat, when an answer shows a layer (`chat-sheet.tsx:104-107`, :197).
- `src/storage/` holds the app's AsyncStorage helpers. `tab-tour.ts` keeps a value per User under `snunow.<name>:{userId}` with `myUserId()`; `opened-marks.ts` and `kept-ids.ts` write one change after another (a `lastChange` chain). `@react-native-async-storage/async-storage` 2.2.0 is installed.

## What to build

- The on/off of 공부공간, 셔틀버스 and 식당 is stored per User in a new `src/storage/` file, whenever it changes: from the stack's buttons or from the chat's `turnOn` (decided 2026-11-22: the last state, the chat's included).
- When the main screen starts, the stored state is read and the layers start as stored. A User with nothing stored starts with all three off, as now. Another User signing in on the same phone gets their own.
- Until the read ends, the layers are off and nothing is written, so the start's "off" never overwrites what was stored; a change made before the read ends wins over it. A failed read counts as all off.
- The comment at `layers.tsx:18-19` says what is true afterwards.

## Must not break

- The stack's buttons, the chat's showing of a layer, the shuttle fetched only while its layer is on.
- Tests start from an empty storage (`__tests__/support/mocks.ts:49`, `startFresh()` clears AsyncStorage), so the existing tests' "starts off" still holds: `layers`, `study-layer`, `shuttle-layer`, `dining-layer` (`.integration`), `__tests__/storage/*.integration.test.ts`.

## Acceptance criteria

- [ ] A layer turned on is on again when the main screen mounts anew over the same storage. (Integration test, which fails before the change.)
- [ ] A layer turned on by the chat is remembered too. (Integration test.)
- [ ] Two Users on one phone each get their own layers; nothing stored means all off. (Storage integration test.)
- [ ] On a phone with the mock build: 공부공간 and 셔틀버스 on, the app force-stopped (`adb shell am force-stop`), opened again: both on, 식당 off. The screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
