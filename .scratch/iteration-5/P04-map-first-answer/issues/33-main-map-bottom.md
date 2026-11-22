# 33: The main map's bottom

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

On the main map with a conversation kept, the input says "이어서 말하기" and a message continues that conversation. "새 대화" stands beside the input to start a new one. The chip "이어서 · <question> ▾" opens the list of questions. The suggestion chips and the line about the AI provider stand over the keyboard whenever it is up, even while the input holds words.

## What to build

- A message sent from the main map always starts a new conversation. The kept one goes among the earlier ones. A message sent in the answer still goes on with the conversation on screen.
- No "새 대화" beside the main map's input.
- The main map's input says "무엇이든 물어보세요". The answer's input still says "이어서 말하기".
- Above the input stands only the chip "이어서 · <question> ›" while a conversation is kept. A press on it brings that answer back as it was.
- The suggestion chips (배고파, 오늘 볼 만한 거 있어?, 공부할 자리) show only while the input has the focus and is empty. The line about the AI provider shows with them, under them.

## Acceptance criteria

- [ ] A message from the main map sends only its own words, shows the answer, and lists the old conversation among the earlier ones. A message in the answer still sends the earlier turns. (Integration test.)
- [ ] With a conversation kept, the main map shows the chip and an input that says "무엇이든 물어보세요", with no "새 대화" beside it. (Integration test.)
- [ ] A press on the chip brings the answer back, with no list of questions. (Integration test.)
- [ ] Words in the input hide the suggestion chips and the line under them, and an empty input shows them again. (Integration test.)
- [ ] The mock build shows the three states on the emulator, and the screens go to the orchestrator before the merge. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
