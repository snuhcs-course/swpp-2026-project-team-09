# 12: The seat numbers show while the fingers zoom

Parent: [P01 spec](../spec.md); the user, after ticket 11 on the phone (2026-11-27): the seat numbers appear only once the fingers lift, and he would like them while zooming, "너무 부하가 크면 안 해도 되고".
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: an app OTA update.

## What happens now

Since ticket 11 the seat picture's zoom changes on the UI thread, and React hears of it only when a gesture or a press ends. A seat's number shows when the whole number fits its box at the zoom React knows (`digitsThatFit`, ticket 01), so during a pinch the numbers stay as they were, and they appear or go once the fingers lift.

## What to build

The cheap way, the orchestrator's brief: one switch each time the zoom crosses where the digits that fit change, in either direction, sent to React once a crossing and never once a frame, so that the seat layer is drawn again at most once a crossing.

- `digitThresholds` (`mobile/src/library/cards/seat-zoom.ts`) finds, once for a room's picture and the lengths its numbers have, the zoom from which each length fits whole. It halves the interval between 1 and the most zoom 30 times, by the same test as `digitsThatFit`.
- `digitsAt`, a worklet, gives the most digits that fit at a zoom from those thresholds.
- The pinch's update (`use-seat-zoom.ts`) compares it with the digits last shown, a shared value, and only when they differ stores them and sends them to React by `scheduleOnRN`. The end of a gesture and 확대 and 축소 set them from the zoom they settle on.
- `seat-picker.tsx` passes the lengths of the room's seat numbers and draws the seats and the picked seat's tag with the digits it is given.

**Measured** (`library-seat-renders.unit.test.tsx`, the 478 seats of 7A 열람실 2 구역, each update in its own act):

- A pinch in by 1.5, 2.2, 2.8, 3.2, and 3.6: the seat layer is drawn again once, at 3.2, the step past where four digits fit (between 2.9 and 3). Before the change: never during the pinch.
- Back out in the same gesture by 3.2, 2.8, and 2.2: once, at 2.8.

**Stutter**, a judgement, not a measurement on a phone: the pinch itself still runs on the UI thread and is not laid out, so the zoom keeps moving smoothly. At a crossing React draws the 478 seats once, and the numbers' texts are added or removed at once. That can cost one short hitch at that moment, and the numbers may land a few frames after the crossing, but it does not come back at every frame as ticket 11's first version did. It is kept; the phone decides. If the hitch shows, the next step costs no React render at all: draw the numbers always, in a layer of their own whose opacity is a shared value.

## Acceptance criteria

- [x] The zoom from which a room's four-digit numbers fit lies between 2.9 and 3, and `digitsAt` agrees with `digitsThatFit`, up to the room's four digits, at every tenth from 1 to 4. (Unit test, `library-seat-edges.unit.test.ts`.)
- [x] During one pinch, the seat layer is drawn again once at the step that crosses where four digits fit, the numbers then show, and once at the step back under, when they go; at no other step. It failed before the change. (Unit test, `library-seat-renders.unit.test.tsx`.)
- [x] The seat picture's tests of tickets 01 and 11 pass unchanged.
- [ ] On a phone: a pinch past about 3× shows the numbers before the fingers lift, and back under hides them, without a stutter you notice.
- [x] Whole lint, format, and types of the app.

## Comments

### Agent usage (2026-11-27)

- One session, p04-58, built tickets 12 and 13 together in one pull request. These are the two tickets' total, the same in ticket 13: count them once.
- Agent time: about 25 minutes, from 17:28 UTC to the push, an estimate. No emulator, no subagents.
- Tokens, from 17:28 UTC to this entry: input 128 uncached, with cache reads 35,690,269 and cache writes 157,833; output 59,655.
