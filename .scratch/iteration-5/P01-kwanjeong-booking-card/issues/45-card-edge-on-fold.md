# 45: The answer sheet's top edge stays still while the time card folds

Parent: ticket 22 (the top's three stops).
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: an OTA update.

## What was wrong

- On the user's phone (preview build with #736, #740 and #741, real server), with "아침 7시에 도서관 갔다가 점심", the lunch step was shown and the chat card stood at middle with a restaurant's menu open. Each fold and unfold of the time card made something blink ("시간 카드를 내렸다가 올릴 때 지도가 다시 그려지면서 깜빡이는 것 같아").
- #744 (P10 ticket 31) stopped the map's labels from being placed again on a fold. A frame-by-frame look at the emulator's recording showed that the blink the user saw was the chat card's top edge dipping for one frame.
- Cause, from the emulator's log:
  - The sheet's scrolling part was laid out at high's height (`Caps.room`), and high moves with the top's stop. A fold laid the sheet out again while it stood at middle. Its place on the UI thread (`offset`, set in the render) came a frame after the new layout, so for one frame its top edge stood lower or higher by what high moved.
  - At an unfold, high was measured from the height the top told. That height reaches the sheet two renders after the stop: through `StepsTop`'s effect, then the frame's state. For about 250 ms high stood under the top as it was at stop 1, then went down under the time card.

## What changes

- The sheet is laid out once, at the most room any top leaves: under the strip at the stage's top, stop 0's high. No fold, no change of step, and no left-out Class's line lays it out again. At low and middle it stands where it was; at high only its place on the UI thread moves.
- Each stop's high is measured from the top's cards as they are laid out, which the stops hold beside the stop (`TopStops.unfoldedHeight`), not from the height the top tells.

## Acceptance criteria

- [x] At low and at middle, through every stop and back, with the person rows opened and shut, and with the other step chosen and back, the sheet stays laid out as it was and shows as it did. (`answer-top-stops`, new; fails on Main.)
- [x] At each stop, high stands under what the stop leaves while the told height is still the one of the stop before. (`frame-card-high`, new; stop 2 fails on Main.)
- [x] The scrolling part is laid out at one height for one request with and without the left-out Classes' line, and for several at every stop. (`frame-card-high`, new; fails on Main.)
- [x] The tests that read high from the laid-out height read what shows at high.
- [ ] Before and after recordings of the fold at middle on the emulator.
- [x] No native file changes; lint, format and types pass for all of `mobile`.

## Comments
