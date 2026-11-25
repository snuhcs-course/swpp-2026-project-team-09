# 81: A first answer's marks come with its lines

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

- The phone, on the first answer of a conversation: "첫 대화에서 저녁을 누르면 지도 상에서 번호들이랑 1번 네모칸이 좀 늦게 뜨는 것 같아". The lines show at once. The numbered marks and the chosen place's label come seconds later.
- An answer's marks are drawn by the native map only as pictures (`Things.kt`: a mark without a picture file is not drawn). Each picture is made the first time its look is used: the look is drawn on a stage outside the screen and captured as a PNG (`marker-images.tsx`, react-native-view-shot). A line needs no picture.
- On the emulator (crowded meal mock, first answer of a fresh app, machine load 10 to 22), the first picture came 3.6 to 9.8 seconds after the answer. The chosen place's label came at 6.1 to 16.9 seconds, and the numbered marks one after another, 0.3 to 0.6 seconds apart, the last after 13.6 to over 28 seconds. A second answer found every picture made and showed them at once.
- The stage drew every look it was asked for at once, and the pictures came back in no set order: the chosen place's label, asked first, came seventh or eighth.

## What to build

1. The stage makes pictures in the order the eye needs them: the chosen place's mark and label first, the numbered places next by their numbers, then the rest of the answer, then every other look. It draws only a few looks at once (`AT_ONCE`, 3), so the first ones are captured first. Each mark is drawn as its picture comes. A look that waits for a Friend's photo is drawn beside them and takes no turn.
2. The pictures that every answer draws alike are made ahead, while the app rests on the everyday map: a candidate's numbered dot without its tag, 1 to 12. A first answer then finds them made. A picture with words, such as the chosen place's label, a tag with its minutes, or the start's and the next Class's labels, is the answer's own and cannot be made ahead.
3. No native change.

## Acceptance criteria

- [ ] An answer's looks are captured in the order: chosen place, numbered places by number, the rest; at most three without a photo on the stage at once.
- [ ] After three seconds on the everyday map, the numbered dots 1 to 12 are made; an answer that draws one finds it made at once.
- [ ] The timings before and after on the emulator are in the PR.

## Comments

### Built (2026-11-26)

- A capture's cost and a batch: to follow with the emulator's timings.
