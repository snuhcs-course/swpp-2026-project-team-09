# 52: A meal answer's labels are placed at the phone's font size, and give way in order

Parent: [P04 spec](../spec.md)
Status: ready-for-agent

Native files: none. Releases: an app OTA update only.

## What happens now

The case: a phone with a large system font, and a meal answer for lunch with one Friend, from 301동.

- The start's dark label "10:45 301동" and the User's dot stand over a tag ("② 3분"); with the camera further out, a leg's minute label stands over the same tag.
- The Friend's face stands on the leg's start and over the map's attribution.

There are three causes:

- **Font size.** The labels' words follow the phone's font size, but their placement boxes (`answerLabelBox`) are worked out at the usual size, so each label is drawn larger than the room it was given.
- **Faces.** A Friend's face counts as a 36-point square around its point, though the pin stands above the point.
- **Fallbacks.**
  - A tag held at a point it shares with another mark falls back to covering anything when no side is free.
  - A leg's minutes are placed before the tags and never left out.

## What changes

- **The phone's font size** (`useWindowDimensions().fontScale`) goes into every label's box, into the camera's room for the marks, and into the room the chosen place's label is panned into view with.
- **A meal answer's Friends' faces** keep their pin's room. The camera keeps a meal answer's marks clear of the map's credit at the bottom, and keeps room above and below its outermost marks for a tag at the phone's font size.
- **When there is no room, labels give way in order**:
  - A leg's minutes move along their line, and with no free place they are left out. They now take their place after the tags.
  - A tag held at a shared point first tries every side clear of the other labels, the faces, and the User's own mark. Failing that, it keeps its number only. Its number is never left out, since it has no dot of its own.
  - The start and the next thing's dark labels may take any side of their point.
  - The chosen place's label and the User's dot never move.
- **Tests run at the usual font scale of 1**, set in the Jest setup; the React Native preset's window says 2.

## Acceptance criteria

- [x] A meal from 301동 with one Friend there and a few places nearby, at a font scale of 1.3: for every Plan chosen, no label covers another, the User's own mark, or the Friend's face. The exception: with the chosen place at the start's own building, its label, which never moves, stands over the Friend's face beside it. (Unit test.)
- [x] A label at a font scale of 1.3 is wider and taller than at 1. (Unit test.)
- [x] Answers other than meals keep their drawing. (Existing tests.)
- [x] No native file changes; lint, format, and types pass on the app.

Not pictured: checked on a phone before the merge.
