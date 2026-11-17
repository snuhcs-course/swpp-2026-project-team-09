---
status: accepted
---

# A timetable screenshot is read by the AI, on the blocks the phone finds

From Iteration 4 (P15-52), `이미지로 불러오기` sends the picked screenshot to the main server, which asks Claude Haiku 5.5, through the AI's chosen key (`llm.key`, [ADR 0013](0013-the-ai-calls-claude-through-the-anthropic-api-or-openrouter.md)), to read the text of each class block. The phone still runs ML Kit on the picture first and finds the blocks and their days and times from the pixels and from where the day and hour labels sit (P13's pipeline); it sends those blocks with the picture, and the model reads only what is printed in each. Code on the server checks every answer (a name must be its lines joined, a room must match the room pattern), groups blocks by their name after NFC and space normalisation, and asks the model once more about blocks whose names are one or two characters apart, rather than merging or splitting them by a guess. With no blocks (a build without the native module, or ML Kit finding no grid) the model reads the whole picture, hour axis included, and code turns its times into 24-hour ones. This reverses P13's rule that the image never leaves the phone.

We chose it because the phone's text half fell short where the pixel half did not. On P13's four screenshots ML Kit read names and rooms well, but in use 안진영 saw classes missing or wrong, and the same class on two days come out as two classes when a character was misread on one of them; none of it could be checked without new device runs, and a line wrapped inside a word cannot be told from two words by its text alone. The model reads the words. Measured on nine screenshots three times each (`.scratch/iteration-2/P13-timetable-ocr/accuracy.md`, P15-52 section), the blocks-and-text split read every name and room character for character, while the model reading times off the whole picture misread an end now and then on a dense axis or a grid's bottom edge (2 of 345 class times in its best run, 6 of 317 with the generic prompt, 1 of 115 on Claude Sonnet 5.5). Letting each side do what it measures best comes closest to the 100 % bar: no wrong time, name or room in 117 readings of the nine, with one block that fades out behind a tab bar left out on two readings.

## Considered Options

- **Fixing the phone's text half.** Its wrapped-name, room and confidence rules were tuned on four screenshots, and the new ones could not be measured without an emulator. A model reads Korean words; ML Kit reads characters.
- **The model reads everything (the whole picture).** Simplest, and it finds blocks the pixels leave out (one fading behind a tab bar), but its times are estimates from a downscaled picture. It stays as the fallback when the phone sends no blocks.
- **Two readings kept where they agree.** It turns a misread time into a time left out, at twice the cost, and does not reach 100 % either.
- **Pixels on the server.** The server has no image library; decoding JPEG would add one. The phone already decodes the picture and runs ML Kit.

## Consequences

- The picture leaves the phone: the app asks once, before the first send, and reads on the phone when the User says no. The server neither stores nor logs the picture or what was read; the route is for signed-in Users, with a body limit of its own (7 MB) and a daily limit per User (`TIMETABLE_READING_DAILY`).
- The app reads on the phone, as before, whenever the server does not answer, refuses, or has no route yet (404), so the app's change can go out over the air before the server's Release.
- A block whose bottom fades out or runs under a bar is sent too, and the model reads its end; the code takes it only from 5 minutes before to 90 minutes after where the colour ends, and leaves the block out otherwise. A block cut at its top or drawn side by side with another is left out and counted, as before; the model does not add blocks in this mode.
- No rule keys on an app's name, theme or layout: days may be letters or English, the axis 12- or 24-hour with or without 오전/오후, and blocks may hold other lines, which the model leaves out of the name.
- ML Kit's confidence is no longer read anywhere.
