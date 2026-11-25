# 03: The map's three layers stay as the User left them, across a restart

Parent: [P06 spec](../spec.md)
Status: done
Taken up on 2026-11-25.
Blocked by: None. Decided 2026-11-25: 03 goes before 01, which is still held; 03 stores only the three layers and shares no source file with 01.

Native files: none. Releases: an app OTA update only.

## What happens now

Received: "현재 앱은 껐다키면 친구/퀘스트 리스트는 펼쳐져있고, 공부공간/셔틀버스/식당은 꺼져있는게 기본. 앱을 종료하더라도(백그라운드가 아니라 아예) 이 다섯개의 on/off 정보는 기억을 하고 다시 켰을 때 마지막 상태를 가져왔으면 좋겠음" (`references/03-1-layers-on.webp`: 공부공간 and 셔틀버스 on, 식당 off). After ticket 01 the lists are gone, so the three layers are what is left.

- `useLayerStack` (`mobile/src/screens/main/layers.tsx:39-67`) keeps the layers in `useState({ dining: false, shuttle: false, study: false })` (:41); the comment at :18-19 says they start off when the app starts. `use-main-layers.ts:121-124` reads them (the shuttle is fetched only while its layer is on).
- `turnOn` (:45) is also called by the chat, when an answer shows a layer (`chat-sheet.tsx:104-107`, :197).
- `src/storage/` holds the app's AsyncStorage helpers. `tab-tour.ts` keeps a value per User under `snunow.<name>:{userId}` with `myUserId()`; `opened-marks.ts` and `kept-ids.ts` write one change after another (a `lastChange` chain). `@react-native-async-storage/async-storage` 2.2.0 is installed.

## What to build

- The on/off of 공부공간, 셔틀버스 and 식당 is stored per User in a new `src/storage/` file, whenever it changes: from the stack's buttons or from the chat's `turnOn` (decided 2026-11-22: the last state, the chat's included).
- When the main screen starts, the stored state is read and the layers start as stored. A User with nothing stored starts with all three off, as now. Another User signing in on the same phone gets their own. With no signed-in User, nothing is read or written.
- Until the read ends, the layers are off and nothing is written, so the start's "off" never overwrites what was stored; a change made before the read ends wins over it. A failed read counts as all off.
- The comment at `layers.tsx:18-19` says what is true afterwards.

## Must not break

- The stack's buttons, the chat's showing of a layer, the shuttle fetched only while its layer is on.
- Tests start from an empty storage (`__tests__/support/mocks.ts:49`, `startFresh()` clears AsyncStorage), so the existing tests' "starts off" still holds: `layers`, `study-layer`, `shuttle-layer`, `dining-layer` (`.integration`), `__tests__/storage/*.integration.test.ts`.

## Decided while building (2026-11-25)

- The layers are kept in `src/storage/map-layers.ts` under `snunow.map-layers:{userId}`, as JSON such as `{"dining":false,"shuttle":true,"study":true}`. A field that is missing or not `true` reads as off. The file takes the `Layers` type from `layers.tsx` (a type-only import).
- They are read and kept in `useLayerStack`, which the stack's buttons and the chat's `turnOn` both pass through, so `chat-sheet.tsx` is unchanged.
- A change made before the read ends wins per layer: the layers changed keep their change, the others come as kept, and that whole state is kept once the read ends. Turning on a layer that is already on keeps nothing.
- In the app the read ends before a press can be made, so the read-before cases are a unit test of `useLayerStack` with the storage stood in (`layer-stack-kept.unit.test.tsx`); the restarts are integration tests.
- The emulator check was left to the user's check on a phone (2026-11-25).

## Acceptance criteria

- [x] A layer turned on is on again when the main screen mounts anew over the same storage. (Integration test, which fails before the change.)
- [x] A layer turned on by the chat is remembered too. (Integration test.)
- [x] Two Users on one phone each get their own layers; nothing stored means all off. (Storage integration test.)
- [ ] On a phone with the mock build: 공부공간 and 셔틀버스 on, the app force-stopped (`adb shell am force-stop`), opened again: both on, 식당 off. The screens go to the orchestrator before the PR. (Emulator.) (Not yet: the user checks it on an Android phone after the PR opens.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments
