# 37: The map does not jump when the answer frame opens, and ✕ or back brings the everyday camera back

Parent: [P02 spec](../spec.md); the chat walk of 2026-11-17 (item 6 of its ranked list)
Status: ready-for-human
Blocked by: nothing

## What to build

Two jumps of the map around the answer frame:

1. **Opening the frame moved the map, even for a reply that draws nothing.**
   - The navigation gives way to the frame. The main screen then grew by the navigation's height, and the native map's view with it.
   - The map keeps its centre when its view grows, so everything on it moved down by half the navigation's height, about 30 points.
   - The fit zoom, which depends on the view's size, changed too.
2. **Leaving by ✕ or back left the map at the answer's camera.**
   - Sometimes that camera was far from where the student was, for example zoomed out over the hills south of campus.
   - The only way back, 내 위치로, first asks for location.

The fix:

- The main screen's map is as high as the screen and lies under the navigation (`main-map-view.tsx`). Its view keeps one size whether the navigation is shown or not, so opening and closing the frame moves nothing on it.
- While the navigation is shown, its height (`useNavCoverOnMain`) is added in two places:
  - to the bottom of the map's inset, so the credit and the provider's logo stay above the navigation;
  - to the bottom padding of the everyday map's fits: a route, the shuttle's line, a cluster.
- The frame's own way out brings the camera back to where the everyday map was when the frame was shown (`use-camera-back.ts`). That way out is ✕, Android's back button, or a card's "닫기".
  - The move is sent after the everyday map's limits (`useEverydayLimits`). Those limits glide in from an answer's camera that is further out than the everyday map allows, and that glide would otherwise come after the restore and replace it.
- Leaving by a map button or by route guidance is left to their own moves.

## Acceptance criteria

- [x] The map's view is as high as the screen with the navigation shown, and stays so with the frame shown.
- [x] After an answer that moved the camera, ✕ brings the camera back to where it was before the answer.
- [x] So does Android's back button.
- [x] On the emulator, a reply that draws nothing leaves the map's labels where they were. After "여기서 먹기" and ✕, the map is back where it was before the press.

## Decisions for review

1. **The map lies under the navigation instead of the camera being corrected after the resize.**
   - A correction sent once the new size is known would still show a frame of the jump.
   - A view that keeps its size has nothing to correct.
   - The Android module's height compensation (README, "a camera in a view whose height changed") now always sees the same height.
2. **A centred move centres on the whole screen.** With the navigation shown, a "go to" move puts its point about 30 points below the middle of what is visible, for example 내 위치로 or a pressed Friend from the list. Moving that point up by half the navigation's height would take a pixel-to-coordinate correction in every centred move. It was left out: the offset is small and the point stays in view.
3. **Only the frame's own way out brings the camera back.**
   - A map button turns its layer on over the map as the answer left it.
   - Route guidance fits its route.
   - "새 대화" closes the frame and leaves the camera, as ticket 32 has it.
4. **The camera kept is the one when the frame was first shown in a stretch.** "이전 답" showing the frame again keeps the camera of that moment, so ✕ after "이전 답" goes back to the everyday camera from before it.

## Comments

### Checked on an emulator (2026-11-17)

The debug build with the mock API.

- Before, on `4.0/Main`:
  - opening the frame with a menu question moved the map's labels down (c05 to c06);
  - ✕ after "여기서 먹기" left the map at the answer's camera (c23).
- After:
  - the labels stay where they were when the frame opens (g01, g03);
  - 63동's card, "여기서 먹기" (g05), then ✕: the map is back where it was before the press (g04, g06).
  - The ✕ press on the emulator sometimes took a second tap while the answer's labels were still placing themselves. Seen once and not reproduced as a fault of this change.

### Agent usage (2026-11-17)

- Agent time: about 20 minutes of one session, after ticket 36's pull request. An estimate from the transcript's timestamps.
- Tokens: input about 41 million, of which about 41 million cache reads and 0.09 million cache writes; output about 56,000. Measured from the session's transcript between the two pull requests.
