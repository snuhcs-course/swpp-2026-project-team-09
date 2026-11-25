# 64: People are picked in the time card, several at once

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none. Builds on ticket 61 (the time card's rows for each person, the grip strip). The look follows the boards drawn for it.

Native files: none expected. Releases: a main server deploy and an app OTA update; the app works with a main server that does not send the other Friends' lanes yet.

## What happens now

"＋ 같이" replaces the bottom card's content with a grid of Friends: the input and everything else give way, and the corner reads "그대로". One tap adds one person and asks again at once; the grid reads 넣는 중 until the answer comes and then closes. The people of the Plan are uneven pills in the bottom card, and at low the title is cut.

## What to build

1. "＋ 같이" opens the time card for picking. Under the combined bar, one row per Friend: a check, the name, one state at the right ("걸음 4분", "위치 모름"), and that person's bar on the same range and scale as the combined bar (the rows of ticket 61). "나" first, always checked. A press on a row checks or unchecks it; unchecked rows are quieter.
2. Order: checked first, then the nearest, a Friend whose location is not known last. Four and a half rows, then the rows scroll between the head and the grip's strip (ticket 61).
3. The card's top-right button reads "완료", with no count. A way out leaves the Plan as it was, Android's back too.
4. Each check changes the combined bar at once (the common free time, worked out on the phone from the lanes); the places and the way are asked once, at 완료.
5. The bottom card keeps showing the answer, at middle if it was high. Its input stays; its main button is hidden while picking.
6. A Friend's face on the map checks or unchecks the same row. A one-line translucent hint says so once, with no button.
7. After 완료 only the checked rows remain; the button reads "같이 3 ›" and opens picking again with them checked. The bottom card has no pills; its summary ends "· 김태현 외 2명과".
8. With no Friends: one line "아직 친구가 없어요" with "친구 추가 ›".

The main server sends, with a meal's or a meet's Plan band, the lanes of the asker's Friends who are not in the conditions (`others`): their busy stretches cut to the band's range and labelled as the Plan's lanes are, and their walking minutes to the Plan's place, null where the asker may not see their location. Without them a Friend's row has its name and state only, and its bar comes with the answer to 완료.

## Acceptance criteria

- [x] Picking several Friends asks once, at 완료, with all of them; leaving asks nothing.
- [x] The rows are ordered checked, nearest, unknown last, and scroll past four and a half.
- [x] The combined bar follows each check before 완료.
- [x] The bottom card keeps its input and the answer while picking; no pills, no "그대로".
- [x] A face on the map checks the same row.
- [x] The main server's `others` are covered by tests, and the app works without them.
- [x] No native file changes; lint, format, and types pass on the app and the main server.

## Comments

Built in PR #552 (marked ready 2026-11-25). The emulator pictures are in the PR body.

### Agent usage (2026-11-25)

- Agent time: about 2 hours 10 minutes in all, an estimate from the transcripts' timestamps.
  - About 1 hour 20 minutes in the map-first-answer side session.
  - About 50 minutes in its three subagents, partly in parallel with it. Among them were the main server's `others` and the rewrite of the old flow's tests.
- Tokens, the session and its subagents together:
  - Output: about 409k.
  - Input: about 1k uncached, plus 197M cache reads and 1.2M cache writes.
