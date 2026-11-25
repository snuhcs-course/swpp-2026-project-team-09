# 81: A first answer's marks come with its lines

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

- The phone, on the first answer of a conversation: "첫 대화에서 저녁을 누르면 지도 상에서 번호들이랑 1번 네모칸이 좀 늦게 뜨는 것 같아". The lines show at once. The numbered marks and the chosen place's label come seconds later.
- An answer's marks are drawn by the native map only as pictures (`Things.kt`: a mark without a picture file is not drawn). Each picture is made the first time its look is used: the look is drawn on a stage outside the screen and captured as a PNG (`marker-images.tsx`, react-native-view-shot). A line needs no picture.
- On the emulator (crowded meal mock, first answer of a fresh app, machine load 10 to 22), the first picture came 3.6 to 9.8 seconds after the answer. The chosen place's label came at 6.1 to 16.9 seconds, and the numbered marks one after another, 0.3 to 0.6 seconds apart, the last after 13.6 to over 28 seconds. A second answer found every picture made and showed them at once.
- Where the time goes (emulator logs of every capture): as the answer comes, the app asks for 89 pictures at once. 19 are the first board's, 70 are every other Plan's board, asked so that a later choice never waits. The stage drew all 89 together, and the native side made them one at a time, so each capture took 7.0 seconds at the median, from 59 ms to 10.4 s. The chosen place's label, asked first, came seventh or eighth.
- The app drew the answer's map again once for every picture made.

## What to build

1. The stage makes pictures in the order the eye needs them: the chosen place's mark and label first, the numbered places next by their numbers, then the rest of the answer, then every other look. The looks asked ahead of their need, the other Plans' boards and the dots made ahead, wait behind every look a screen shows now (`later`), and a look a screen comes to show moves up. The stage draws only a few looks at once (`AT_ONCE`, 3), so the first ones are captured first. Each mark is drawn as its picture comes. A look that waits for a Friend's photo is drawn beside them and takes no turn.
2. Pictures made within one frame (16 ms) reach the screens as one change, so the answer's map draws again once a frame, not once a picture.
3. The pictures that every answer draws alike are made ahead, while the app rests on the everyday map: a candidate's numbered dot without its tag, 1 to 12, and a shuttle stop's dot (no words since P04 ticket 80). A first answer then finds them made. A picture with words, such as the chosen place's label, a tag with its minutes, or the start's and the next Class's labels, is the answer's own and cannot be made ahead.
4. No native change.

## Acceptance criteria

- [ ] An answer's looks are captured in the order: chosen place, numbered places by number, the rest, then the looks asked ahead; at most three without a photo on the stage at once.
- [ ] Pictures made within one frame reach a screen as one change.
- [ ] After three seconds on the everyday map, the numbered dots 1 to 12 are made; an answer that draws one finds it made at once.
- [ ] The timings before and after on the emulator are in the PR.

## Comments

### Built (2026-11-26)

- Timings on the emulator (crowded meal mock, first answer of a fresh load, machine load 5 to 12), from the answer's arrival:

  | | First picture | Chosen place | 9 numbered places | One capture (median) | Captures at once |
  | --- | --- | --- | --- | --- | --- |
  | 5.0/Main | 1.9 s | 5.8 s | 12.5 s | 7.0 s | 89 |
  | This ticket, before `later` | at arrival (4 dots made ahead) | 1.5 s | 5.3 s | 40 ms | 5 |
  | This ticket | at arrival (4 dots made ahead) | 1.5 s | 2.6 s (all 12 marks at 2.8 s) | 44 ms | 5 |

  Before `later`, the 3 seconds after the chosen place were the other Plans' chosen places. They ranked with it and came before the numbered places. `later` puts them behind the board on screen.
- One capture costs about 40 ms when the stage holds three: drawing the look, the view-shot, and writing the PNG. It took 7 seconds when 89 waited on the native side together.
- A batch as one view-shot of a sheet cut into pieces needs the native side to read part of a picture. `Things.kt` reads a whole file per look (`BitmapFactory.decodeFile`), and cutting a PNG in JavaScript needs a native image library. So it is not done here (no native change).
- Splitting a candidate into parts that repeat (asked on 2026-11-26): the numbered dot, made ahead, and its minutes tag as a picture of its own, named by its side and words alone ("26분" is then one picture for every candidate and every answer), drawn as two marks at one position. The native side allows it without a change: each picture has its own anchor (`anchorX`, `anchorY`, the symbol box's centre in the picture), and a tag already stands without its dot (`symbol: null`). Not built here, since the candidates' look is about to change.
- Of the two looks the user is choosing between, the coral numbered circle with the minutes in a glass tag is cheaper for this pipeline: the circles 1 to 12 are made ahead, and the "N분" tags are few and repeat across answers. A fork icon with the Restaurant's name and minutes is one picture per Restaurant, like today's tag per candidate. Nothing in this ticket depends on today's look: what is made ahead is a list of looks, and the order reads only a look's role and number.

### Agent usage (2026-11-26)

- Agent time: about 50 minutes on this ticket in the p04-58 session (an estimate), including two emulator runs of about 15 and 10 minutes. No subagents.
- Tokens: the session's tokens from 2026-11-25 20:22 UTC to this entry cover this ticket, ticket 80, P04-69's wait without a time limit, ticket 76's pill fix, two merges into PR 573, and the late-marks measurement, about 1 hour 50 minutes of agent time in all. They are not split by ticket. Input 664 uncached, cache reads 140,943,642 and cache writes 449,676; output 251,858.

