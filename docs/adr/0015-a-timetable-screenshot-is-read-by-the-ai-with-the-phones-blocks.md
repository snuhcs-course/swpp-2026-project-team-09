---
status: accepted
---

# A timetable screenshot is read by the AI, on blocks the phone finds from the pixels alone

From Iteration 4 (P15-52), `이미지로 불러오기` sends the picked screenshot to the main server, which asks Claude Haiku 5.5, through the AI's chosen key (`llm.key`, [ADR 0013](0013-the-ai-calls-claude-through-the-anthropic-api-or-openrouter.md)), to read it. The phone first finds the class blocks from the picture's pixels alone: the day columns from the evenly spaced vertical lines, and each coloured block's column, top, bottom, colour and whether its bottom fades out. No text is used, so no label ML Kit misreads can misplace a block. The server asks the model twice: first for the layout (the hour labels as printed, and each listed block's day label and rough start and end), then, once the code has placed the blocks, for each block's text on its placed day and time. The code places the blocks by fitting one line from pixels to minutes through all the model's rough times, which a few misread times cannot move, and by giving each column the day most of its blocks were read with, the days running on by one. It checks every answer (a name must be its lines joined, a room must match the room pattern), groups blocks by their name after NFC and space normalisation, and asks again about blocks whose names are one or two characters apart rather than merging or splitting them by a guess. Without a grid, or when the fit or the days do not hold, the model reads the whole picture, hour axis included. This reverses P13's rule that the image never leaves the phone.

We chose it because each side does what it measures best, and nothing rests on what the owner saw fail. In use 안진영 saw classes missing or wrong, and the same class on two days come out as two classes when a character was misread on one of them; those faults lie in ML Kit's text, including the labels the phone used to place blocks, and none could be measured without device runs. Measured on nine screenshots three times each (`.scratch/iteration-2/P13-timetable-ocr/accuracy.md`, P15-52 sections): the model reading the whole picture got names and rooms right but times wrong now and then (2 of 345 class times in its best run, 6 of 317 with the generic prompt, 1 of 115 on Claude Sonnet 5.5); blocks placed with ML Kit's labels and read by the model got none wrong, but their geometry rested on hand-placed labels for the five new screenshots; the label-free grid with two calls got none wrong and 344 of 345 all right with no OCR'd or hand-placed label. Naming blocks to the model as "column 3, block 2" let it read the next block's text, so the text is always read on placed days and times.

## Considered Options

- **Fixing the phone's text half.** Its wrapped-name, room and confidence rules were tuned on four screenshots, and the new ones could not be measured without an emulator. A model reads Korean words; ML Kit reads characters.
- **The model reads everything (the whole picture).** Simplest, but its times are estimates from a downscaled picture. It stays as the fallback.
- **Blocks placed with ML Kit's labels (the first version of this decision).** As accurate on the nine, but the labels were the unmeasured part.
- **Hour labels found as ink in the pixels.** Light-grey labels, card edges and block edges bleeding into the label strip broke it on one screenshot or another; every fix fitted one picture.
- **One call for layout and text.** Faster, but the model skipped blocks, and when asked again read the text of the wrong block.
- **Two readings kept where they agree.** It turns a misread into a block left out, at twice the cost, and does not reach 100 % either.
- **Pixels on the server.** The server has no image library; decoding JPEG would add one. The phone already decodes the picture.

## Consequences

- The picture leaves the phone: the app asks once, before the first send, and reads on the phone when the User says no. The server neither stores nor logs the picture or what was read; the route is for signed-in Users, with a body limit of its own (7 MB), a daily limit per User (`TIMETABLE_READING_DAILY`), bounds on the model's answer (blocks, lines, lengths, output tokens), and a fallback to the phone's reader on any refusal or on a server without the route.
- A reading takes two model calls, about 13 s and USD 0.0025.
- A block whose bottom fades or runs under a bar keeps the end where its colour is last seen only when the end the model read agrees with it within 5 minutes; otherwise it is left out and counted. Trusting the model's end alone turned hidden ends into wrong times on synthetic timetables.
- A block cut at its top or drawn side by side with another is not sent; the phone counts it with what the server left out.
- No rule keys on an app's name, theme or layout: days may be letters or English, the axis 12- or 24-hour with or without 오전/오후, and blocks may hold other lines, which the model leaves out of the name.
- ML Kit's text is no longer used on this path, nor its confidence anywhere; the native module is still needed for the pixel copy, and the phone's own reader still uses its text when it reads alone.
