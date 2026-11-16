# 33: The shuttle's "not in service" words are a toast that goes by itself

Parent: [P02 spec](../spec.md); the user's own use of the released app (`snunow/all/26.11.17-2`) on 2026-11-17
Status: ready-for-human
Blocked by: nothing

## What to build

Turning the shuttle layer on outside the service hours showed a white card at the bottom of the map: "지금은 셔틀버스가 운행하지 않아요" and the route's service hours in four lines. The card stayed for as long as the layer was on. It hid the 활성 파티 row and the zoom control, and pushed the 편의기능 button up. The user expected a short notice that goes by itself, as the app's other notices do.

- Turning the layer on outside the service hours shows the design system's toast, with the bus icon: "지금은 셔틀버스가 운행하지 않아요 · 평일 08:00–21:00". It goes after 3.5 seconds.
- It is said again each time the layer is turned on outside the hours.
- When the hours end while the layer is on, it is said once.
- The line and the stops stay on the map, as before.
- Nothing else at the bottom of the map moves or hides for it: the 활성 파티 row, the zoom control, and the 편의기능 button stay where they are.

## Acceptance criteria

- [x] The toast shows on a Saturday at noon, and on a weekday at 07:59 and at 21:00; not on a weekday at 08:00 or 20:59.
- [x] It is gone after four seconds, with the line and the stops still drawn.
- [x] Turning the layer off and on says it again.
- [x] With the layer on from 20:59:40, it shows once when 21:00 passes and is gone ten seconds later.
- [x] The card (`shuttle-notice`) and the room kept for it are gone.

## Decisions for review

1. **The hours in the toast come from the app's own rule, not the route's text.** The route's `serviceHours` is four lines of free text, too long for a toast. `inService` already decides by the app's constant (weekdays 08:00–21:00), so the toast says that rule's hours and cannot disagree with when it shows. The route's full text is no longer shown anywhere in the app.
2. **3.5 seconds, not the toast's usual 2.4.** The words hold two facts, that the bus is not running and when it runs.
3. **The bus icon,** in place of the toast's usual check mark, which reads as "done".

## Comments

### Checked on an emulator (2026-11-17)

The debug build with the mock API. The mock's clock stands at the frame's moment, a weekday noon, so for these screens alone the layer was made to read the time as outside the hours (a local edit, not committed).

- Before: the card stays at the bottom after ten seconds and hides the 활성 파티 row; the 편의기능 button stands above it.
- After: the toast shows above the AI input; five seconds later it is gone, and the 활성 파티 row and the 편의기능 button are in their usual places, with the line still drawn.

### Agent usage (2026-11-17)

- Agent time: about 25 minutes of one session, including setting up the emulator run that the following tickets share. An estimate from the transcript's timestamps.
- Tokens: input about 12.5 million, of which about 12.3 million cache reads and 0.16 million cache writes; output about 40,000. Measured from the session's transcript at the time of the pull request; the session went on to other tickets.
