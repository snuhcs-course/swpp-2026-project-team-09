# 06: The card of a received invitation shows the invitee's own way

Parent: [P02 spec](../spec.md) ("A received invitation")
Status: ready-for-agent
Blocked by: 03; the invitee's own way (`GET /quest-invitations/:id`, P03 ticket 02); a Notification's address opening its card (P05 ticket 02, P04 ticket 04)

## What to build

A User whose phone has the switch on opens an invitation, from "알림" or from a push, and sees it in the answer frame's shape: their own way on the map (where they set out from, the line to the Place where everyone is together, the Merging Point when it lies on their way, and the Place of what follows), and one card at the bottom with whose Quest it is, when and where, with whom, when to set out, the Quest's steps, and "수락" and "거절". Nothing of anyone else's location is drawn.

## Acceptance criteria

- [x] **The card's id.** Each invitation the User received is a card of the main screen with the id `invitation:<invitationId>`, so that the address `/main?card=invitation:<invitationId>` opens it, once the phone's switch is read; with the switch off no such card exists, and the address opens the "파티" tab's invitations as today.
- [x] **The map** draws the scene the server gives for the invitee: their own dot, one line for each leg of their way, the flags at the Merging Point and at the destination, and the Place of what follows, by the marks and the camera of an answer; the everyday map's things give way as for a Plan, and no Avatar of anyone else is drawn. The address itself moves no camera.
- [x] **The card** shows: whose invitation ("유상의 파티 초대"), the time and the title of the destination step, who is in so far, the way's lines as the server wrote them, the steps in order, "수락" as the main button and "거절" beside it, and the line that says that only the User's own way is shown.
- [x] **A way that cannot be drawn** (off campus, busy, or unknown): the card shows the server's line, or none, and the map draws what the scene holds. Off campus, where the app sends no position and the server answers `unknown`, the card shows the server's words for a phone off campus.
- [x] **수락** accepts the invitation; the card then says so and closes to the everyday map with the Quest among the User's Quests. **거절** declines it and closes the card. Each takes one press for its invitation, a reply closes only its own card, and a failure shows a toast and leaves the card.
- [x] **An invitation that waits no more** (cancelled, or answered elsewhere): the card says so and closes, whether a read says 404, the list of invitations is read again without it, or an address names one the list does not hold.
- [x] The phone's position goes with the request only while the User is on campus, as a recalculation sends it.
- [x] **Tests**: unit tests for the card's lines from the stored copies of the server's real replies; integration tests at the main screen over the fake main server: the address opening the card, the marks, both buttons down to their requests, a failure, and an invitation that waits no more.
- [x] The app's README says how a received invitation is shown.
- [x] The screen is run on an Android emulator, and the pull request carries the screen of a received invitation.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

### Decisions (2026-11-15)

1. `drawingOfScene(scene, setting)` in `answer-marks.ts` draws a bare scene; `drawingOf` calls it with the Plan's number on the pick and the answer's Plans as candidates. An invitation's pick carries no number, as the wireframe draws it.
2. The invitation's card position is the campus's centre (`centreOf(CAMPUS_BOUNDS)`): the list of received invitations gives the Quest's Place only as a label, with no position. No camera moves to it: the address selects an invitation's card without `goTo`, and the card's own camera fits the scene.
3. Invitation cards stand apart from the Place groups and the study clusters, and `useThings` draws no marker for them. The main screen counts its cards ready once the switch's stored value is read (`useKeptAnswerSwitch`, a second hook beside `useAnswerSwitch`, null until the phone has said, and off when the phone cannot be read) and, with the switch on, the invitations are known, so that an address waits for both. While the switch is off the list's query is not subscribed (`subscribed: on`), so its refetches do not render the main screen.
4. The card shows only while the answer frame is not shown, as every selected card; the frame wins, and the card appears once the frame is closed.
5. While the card is shown a press on the map opens no card, as while the frame is shown.
6. The read takes the User's on-campus position at the moment of the read; a later move of the phone does not read the card again. The card's query (`invitationCardQuery` in `@/api/queries.ts`) is keyed under the invitations' key, so that whatever fetches the list again (`quests-changed`, the app back in front, an answer of the 파티 tab) reads the shown card again.
7. The destination step is the step that starts at the gathering's start at the gathering's Place; without one the title line falls back to the Quest's title after the time.
8. 수락 and 거절 reuse the 파티 tab's `usePartyActions`, whose `accept` and `decline` now give whether the main server did it. The tab's own words are kept: "파티에 참여했어요" after an acceptance (not "파티에 들어왔어요"), and its refusal words, "요청하지 못했어요. 다시 시도해 주세요" for an unknown failure (not "처리하지 못했어요. 잠시 후 다시 시도해 주세요"). The tab says nothing after a decline, so the card says "초대를 거절했어요". A request in flight belongs to its invitation's id, and its reply closes the card only while that invitation's card is the one selected.
9. Any 404 of the read counts as an invitation that waits no more, and reads the list of invitations again. A failure of the main server's own is asked once more before "초대를 불러오지 못했어요", as every query of the app is.
10. The tab bar's giving way is asked by the main screen's `useFramed` (in `main-screen.tsx`), which knows both the frame and the invitation's card.
11. The steps' list of the card after inviting moved to `answer/quest-steps.tsx`, which both cards draw, each number white in a dark circle as the wireframe draws it.
12. Android's back button needed nothing new: the selection's own back handler closes the invitation's card.
13. To keep the main screen within lint's 50 lines a function, `useThings` is called inside `useMapView`, and `useRoute` inside the screen's `useLines`; `useFramed` gives the invitation and whether the frame or its card is shown.
14. Off campus the app keeps sending no position. The card shows the server's words for a phone off campus, "캠퍼스 밖이라 길은 그리지 못해요.", when the way's status is `unknown` and the phone told a position outside the campus rectangle (`me.offCampus`); for `unknown` the server sends no line and a scene of the destination alone, which the map draws.
15. No Avatar of a Friend or of the User's Party is drawn while the card is shown, with a scene or without one (the everyday map's markers and the User's own Avatar then stay); the shuttle's vehicles are no one's and stay.
16. An invitation whose card was selected and left the cards while the switch stayed on is told with "이미 끝난 초대예요"; the selection itself drops the card. One answered on this phone leaves without that word, though the list may come back before its card is closed, and with the switch turned off the cards leave without a word too.
17. With the switch on and the cards known, an address of an invitation no card holds says "이미 끝난 초대예요" and stays on the map.
18. The camera's top room for an invitation is the status bar's inset and the room the marks need above, in place of the pill's.
19. The camera worked out for an invitation was right: the scene's top-most point, 63동, is a point of the drawing, and the way's south end stood where the camera put it. Kakao's map behind the Android module showed every camera closer than sent once the tab bar gave way, by the binary logarithm of the view's heights (914 over 826 on the emulator, 10%), because the module sets the camera's height by a scale it measures once, when the map opens, and Kakao's camera shows as much from top to bottom at one height whatever the view's height. An answer's Plan was as much too close, which its rule of keeping the pick's side hid. On Android, `native-map.tsx` sends a zoom less that logarithm, the view's height at the module's first report standing for its height at the opening, and lowers the module's lowest zoom by as much, so that the camera shown is the one asked, at the lowest zoom too. The Android module measuring its scale again where the camera rests, as the iOS one does, belongs to the next native release, which drops this.
20. The way's lines of a received invitation read as body text after the route arrow, which the wireframe draws there and the design system has (it has no walking icon), their strong words in the key colour and the semibold weight: `AnswerLines` takes `way`.

### Checked on an emulator (2026-11-15)

On the Android emulator (1080 × 2400, density 2.625) with the mock's stored card of 민수:

- `snunow://main?card=invitation:qi-1` opened the card with the tab bar gone: "유상의 파티 초대" with ✕, "12:33 학생회관식당에서 식사", "유상과 함께", the way's line, the two steps, "수락" and "거절", and the line that only the User's own way is shown.
- The map drew 민수's dot at 302동 with "나 · 18분", the navy line by 301동, under the flag "12:18 유상과 만남", to 63동 with "12:33 학생회관식당에서 식사" under it, and no one else's Avatar.
- "거절" closed the card to the everyday map with the tab bar back.

Fixed after the check: 63동 stood under the status bar (decision 19), and the way's line wrapped its last word alone at the answer's size (decision 20). Run again on the emulator with both fixes: 63동 and its label lie below the status bar with the whole way inside the map, the way's line fits one line after the route arrow, and the answer to "배고파, 민수랑 같이" still fits its first Plan between the pill and the card, a little wider than before the fix.

### Agent usage (2026-11-15)

From the opening of ticket 05's pull request to the opening of this one. One session with four subagents for this ticket (the implementation, two reviewers, and the reviews' fixes). The session's own time in that stretch also holds the answers to the reviews of pull requests 245 and 246, the rules of the shared Mac, and the design review of the answer card's screens.

- Agent time: about 145 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 430,049; input 168,193,314, of which 165,232,977 were cache reads, 2,959,333 cache writes, and 1,004 uncached. Without cache reads: 3,390,386.

### Agent usage (2026-11-15, after the pull request opened)

Taking ticket 05's branch and `4.0/Main` in, the camera and the way's lines found on the emulator, and the second emulator check. One session with two subagents (the merge, and the fixes); the session's own time in that stretch also holds the merges of pull requests 245 and 246.

- Agent time: about 76 minutes, an estimate from the transcripts' timestamps, as above.
- Tokens: output 270,362; input 133,351,863, of which 132,386,171 were cache reads, 965,038 cache writes, and 654 uncached. Without cache reads: 1,236,054.
