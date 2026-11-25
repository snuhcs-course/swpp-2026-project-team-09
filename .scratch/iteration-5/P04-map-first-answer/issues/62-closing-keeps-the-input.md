# 62: Closing the answer removes only its sheet, and the input stays where it stood

Parent: [P04 spec](../spec.md)
Status: needs-info
Blocked by: none. Follows ticket 61, where this was item 7 and was moved out.

Native files: none expected. Releases: an app OTA update.

## What happens now

The answer's sheet (ticket 61) holds a fixed footer, the input and the main button, at the screen's bottom, and the tab bar is hidden while the answer shows. Closing the answer, by ✕, a drag down from low, or back, returns to the main map. There, the AI input stands about 65 dp higher, above the tab bar, and the tabs appear. So the input jumps up at the close and the tabs come in under it.

## What to build

1. Closing removes only the sheet: the main map's input stands where the footer's input stood, so nothing under the finger moves.
2. How the tab bar comes back, and whether the input then moves up to its usual place, is decided with the user after he has tried closing on his phone.

## Acceptance criteria

- [ ] Closing the answer by ✕, by a drag down from low, and by back leaves the input at the place the footer's input had, at font scale 1.0 and 1.3.
- [ ] What the user decides about the tab bar is built and tested.
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

Waiting on the user's word after he has tried closing on his phone (2026-11-25).
