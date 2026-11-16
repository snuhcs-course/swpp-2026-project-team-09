# 30: Events and recruiting parties are answered on the map, and a new party is posted from it

Parent: [P02 spec](../spec.md); the design's sections 6.3 (Events) and 6.4 (Parties), rows 4 and 5; P03's spec, "Events and recruiting Quests answered on the map"
Status: ready-for-agent
Blocked by: nothing. The server half is P03 tickets 08 to 10 (#256), on `4.0/Main`.

## What to build

The main server already answers events, recruiting parties, and a new recruiting party in the shape of a meal's answer, but only to an app that announces the capability `events`. The app has the contract, the checks, and the mock's real copies. It does not announce the capability, and the answer frame has no buttons for these kinds. This ticket draws them.

- **The capability.** `ANSWER_CAPABILITIES` (`mobile/src/api/assistant-types.ts`) gains `'events'`, so that a typed "오늘 볼 만한 거 있어?" or "배드민턴 칠 사람" reaches `planEvents`, `planQuests`, and `planNewQuest`.
- **An events Plan** (`input.kind === 'events'`; board Alone 1, Together 5, and Together 8):
  - "같이 갈 파티" recalculates `{ kind: 'quests', globalEventId: the Plan's event, questIds: null }` with no model. A Friend's party is named on the button when the server names one ("김민수가 있는 파티").
  - "새로 모집" recalculates `{ kind: 'new-quest', date, globalEventId: the event, title: null, placeId: null, time: null, people: [the User] }`.
  - "길 안내" starts the route guidance to the event's Place, as a Lookup's `guide` does.
- **A recruiting party's Plan** (`input.kind === 'quests'`; Together 5 to 7, Join 1 to 3):
  - "참여하기", or "참여 신청" for an Approval Quest, opens the party's post (`openPost`), where the User joins. The answer never joins for them.
  - "새로 모집" recalculates a new-quest input for the same event, or for the activity the search was for.
- **A new party's Plan** (`input.kind === 'new-quest'`; Together 8 to 11, Recruit 4 and 5):
  - "이대로 모집" posts it through `POST /plans`, as "이대로 초대" makes a meal's Quest (`use-plan-invitation`), with the same body and the Idempotency-Key.
  - Then the card says what was posted and opens 내 파티 as a made meal Quest does (P02 ticket 07).
  - A Friend candidate is added with "＋ 같이" or a face, and removed with ✕, by the existing corrections: `hasPeople` already covers `new-quest`.
- **The places that assume a meal or a meet**:
  - `plan-card.tsx`: the who and how words (`:234`) and the `meet` flag (`:261`);
  - `use-corrections.ts`, `withBound`, and `windowOf`;
  - `place-card.tsx:38`: a building card's `plan` buttons are drawn for a meal only. With this ticket they are also drawn for `events` and `quests` ("행사 보기", "같이 갈 파티" on board a2).
  - Each draws these kinds as the server answers them, or leaves them out on purpose.
- **The mock** answers board Alone 1's words "오늘 볼 만한 거 있어?" with `EVENTS_ANSWER`, "배드민턴 칠 사람" with `QUESTS_ANSWER`, and "새로 모집" with `NEW_QUEST_ANSWER`. Their recalculations are answered with the same copies.

## Acceptance criteria

- [x] A chat request with a context carries `events` among its capabilities.
- [x] Board Alone 1 (the mock's copy): the events answer is drawn with its Plans, the arrows, the clash marked, and the buttons "같이 갈 파티", "새로 모집", and "길 안내".
- [x] "같이 갈 파티" sends the quests recalculation, with its body checked, and the answer of parties is drawn: the Friend's party first, and one that has started faded with its reason.
- [x] A party's Plan opens its post with "참여하기" or "참여 신청", and nothing is joined by the answer.
- [x] "새로 모집" sends the new-quest recalculation, and its Plan draws the candidate Friends. Adding one recalculates.
- [x] "이대로 모집" sends `POST /plans` with the new-quest making body and shows the made Quest.
- [x] A building card with events shows "행사 보기" and "같이 갈 파티" and opens those answers.
- [x] A meal's and a meet's answers are unchanged.
- [x] Integration tests at the main screen over the fake main server:
  - each button down to its request body;
  - the answers drawn;
  - "이대로 모집" and its 201;
  - a building card's plan buttons;
  - the switch off.
- [ ] The screens are run on an Android emulator, and the pull request carries them.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- What the answers hold, and how the server plans them, is P03's spec, "Events and recruiting Quests answered on the map", and P03 tickets 08 to 10.
- The mock's copies are the main server's real answers for the design's examples:
  - row 4: the job fair, Friday 13:50;
  - row 5: badminton, Thursday 16:45, and its "새로 모집".

### Decisions for review (2026-11-16)

1. **"길 안내", not "여기로".** The design's Alone 3 "여기로" also books a leave-by notification. That notification is not built (P02's spec puts "여기로" out of scope), so an events Plan offers the route guidance a Lookup already has.
2. **"이대로 모집" posts with one press,** as "이대로 초대" does for a meal. The Plan card already shows the time, the Place, the count, and the invited Friends, so the design's confirm card (Together 10, "모집 만들기" then "이대로 만들기") is not drawn as a second step.
3. **Joining stays on the post.** A party's Plan opens its post, and the User joins there with today's "참여하기" or "참여 신청" (design: "It does not join for me").
4. **The time band is read-only for events, parties, and a new party.**
   - Dragging it changes nothing.
   - A new party's time changes only through the people, as Together 9 does when 지은 is added.
   - A time the User says ("저녁 7시에") goes to the Assistant in words.
5. **The building card** draws its `plan` buttons for `events` and `quests` too, now that the frame draws those answers (P02-22's note (11) is lifted).
6. **"＋ 같이" only on a new party.** Events and parties take no Friend, so their chips have no "＋ 같이". A Friend comes through "새로 모집", whose chip is read as "초대할 친구 추가" and whose list asks "누구를 초대할까요?". `ConditionChips` takes the chip's spoken name (`addName`, null to leave it out) in place of `meet`.
7. **"같이 갈 파티" is never named after a Friend's party.** The main server's events Plan carries no Friend's party; only a party's Plan carries `friendNames`. The parties' answer it opens puts the Friend's party first.
8. **"새로 모집" on the parties of a search goes to the Assistant in words**, with the Plan on screen. Only the Assistant knows the activity's words, and its `planNewQuest` puts the Friends free then into the party first (design 6.4, Recruit 4); a recalculation would not. On the parties of a Global Event it recalculates with no model, for that event on the party's day in Korea.
9. **The buttons stand in a row of their own**, cells of one width, under the arrows. Three buttons beside the arrows would be cut on a phone. A new party's Plan lists its Friends who could come under "그때 비어 있는 친구", each a cell with the line of their day; a press adds one, as "＋ 같이" does.
10. **After "이대로 모집"** the card after inviting shows the posted party's steps. With nobody invited it says "파티를 모집했어요" and "17:10에 가면 돼요". The frame does not leave for 내 파티, which would hide that card. The party is among 내 파티 at once, its id kept as a meal Quest's is. Ticket 07's flag stays for a Closed Quest with invited Friends, so a posted party has no flag after closing.
11. **Where from, for these kinds.** A new party's people carry no constraints, which the main server refuses, so a start chosen on the map leaves a new party as it is (`withOrigin`). The where-from and until chips of events, parties, and a new party still take a press and change nothing, as the band (decision 4). Drawing them read-only needs `use-corrections.ts` or the chips' handlers in `plan-card.tsx`'s `ConditionChips` call, left for review.
12. **The building card's buttons** are cells of one width, every `plan` button and then "가는 길".
13. **"길 안내" and the words to the Assistant** reach the card through a context put around the answer frame in `map-bottom.tsx` (`answer/row-four-actions.tsx`), since the frame gives the Plan's card neither.
14. **What was dropped is said in the card.** The main server's scene of events and parties draws nothing it dropped, so the card lists each dropped reason in faint ink above the buttons ("17:00 파티는 17:02에야 도착해요"). The design's browsing into a faded party with the arrows is not built.
15. **The mock's POST /plans** still answers the meal's stored Quest for any Plan, a new party's included: no real reply to a new party is stored. The tests post with a reply built by hand.
16. The push permission is asked at "이대로 초대" and "이대로 모집" (board t17), as at the booking cards: once `POST /plans` made the Quest, by `useAskForPush` in `use-plan-invitation.ts`'s `invite`.
17. **Review (2026-11-16): the band is read-only as decision 4 says.** For events, parties, and a new party the band is drawn without handles and without the whole-band drag, as a Lookup's band is, and the where-from and time chips take no press (`bandIsFixed` in `row-four-inputs.ts`). Before, a handle let go stayed at a time the Plan did not have, and "이대로 모집" would have posted the Plan's own start.

### Emulator check (2026-11-16)

Not done. At 14:34 the shared emulator showed Android's own dialog "Process system isn't responding" in front, while the Mac's load average stood at 20 to 50. The dialog is the system's, not SNU Now's, so nothing was pressed on it, and the check stopped there: the bundle of this branch had loaded (2,836 modules), and the app's bundler address was set back to 8081. The way in needs no Korean typing: on the mock, press 문화관 (73동), then "행사 보기"; "같이 갈 파티" and "새로 모집" follow from the answer. The screens are added to the pull request once the emulator is usable.

### Agent usage (2026-11-16)

One implementing subagent (Opus 5.5), resumed for the merge of `4.0/Main` and the push permission's ask. This session's ticket, review, and pull request are counted under P03 ticket 07.

- Agent time: about 150 minutes, an estimate from the transcript's timestamps; it includes long waits for test runs at a load average of 30 to 50 and for the Mac's shared check slots.
- Tokens: output 194,619; input 89,653,619, of which 89,174,843 were cache reads, 478,252 cache writes, and 524 uncached. Without cache reads: 673,395.
