# 18: The model's words are never dropped beside a Lookup

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [05](05-lookups-and-words-one-line.md) for the dock's line.

Native files: none. Releases: an app OTA update only.

## What to build

From the user's feedback: asked for a 파티 at a time he has a Class, he saw only "11월 20일 금요일 수업 1개", then asked "뭐 어쩌라고 이거 왜 보여줌?" and got the same. The model's words said why the day was shown, and the app dropped them for the Lookup's lines.

- When a reply has words and a Lookup, for every Lookup (a way or a place the map draws included), the words are the dock's one line: they say why the Lookup is shown. A press raises the card, which shows the words above the Lookup's card. The app never judges whether the words repeat the map; keeping a way's bottom to one row is the server's job (its model writes nothing for a way or place the map draws unless it has something the map cannot say).
- A day Lookup with words docks with them; without words it keeps its card open, as before.
- In the list of earlier answers, such a turn shows the words, then the Lookup's lines.
- When the model said nothing: a Lookup's own headline is the line, but a way or a place the map draws has no line, and 근거 › when it has a basis, until its flag raises the card (the next pull request). Beside a refusal, the refusal's first line, as before.

## What happens now

- `lookupRestOf` takes the Lookup's headline over the words, and a day Lookup keeps its card open with the Lookup's lines alone.
- `Words` draws the Lookup's card without the words, and the earlier answers (`earlier-turns.tsx`) show the Lookup's lines without the words.

## What changes

- `lookupRestOf`: the line is the refusal's first line, else the model's words when there are any, else the Lookup's headline (none for a way or a place the map draws); `basis` (근거 ›) only without a line. `lookupDocks` docks a day Lookup that has words.
- `Words`: the words as Markdown over the Lookup's card.
- `earlier-turns.tsx`: the words, then the Lookup's lines.

## Must not break

- 길 안내 beside the input for a way or a place; 근거 › for one with no words; a refusal beside a Lookup; the Lookup bands and recalculation (`answer-lookup`).

## Acceptance criteria

- [ ] A day Lookup with words: the words in the dock, not the day's line; pressed, the words over the Lookup's card; in the earlier answers, the words. (Integration test.)
- [ ] The line's rule for words, no words, a way the map draws, and a refusal. (Unit test.)
- [ ] A way Lookup with words has them as its line and no 근거 ›; one without words has no line and 근거 ›. (Integration test.)
- [ ] A Lookup with words on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
