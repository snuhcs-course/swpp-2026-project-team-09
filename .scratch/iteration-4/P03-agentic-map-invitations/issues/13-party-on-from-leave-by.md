# 13: "파티 켜기" on the time to leave

Parent: [P03 spec](../spec.md); the design's section 5 ("Parties and invitations": the Assistant suggests the moment by adding a "파티 켜기" button to the leave-by notification) and section 6.1 (Together 10)
Status: ready-for-agent
Blocked by: package D's time to leave in "알림" (P05 ticket 04, merged)

## What to build

The row of "알림" that tells a User when to leave for a party ("12:18 나설 시각", then "지금 나서요") gets a "파티 켜기" button. A press turns the party's Party on, as the room's activation does today: it opens the Party of that Quest, or enters the one another Holder opened. The User stays where they are, and a toast says what happened. The Assistant never turns a Party on by itself. This is wireframe row "1. 배고파", board 같이 ⑭, and row "11. 알림 모음" in the list.

## Acceptance criteria

- [x] A time-to-leave row of a Quest whose Party is not on for the User shows "파티 켜기"; a row whose Party the User is already in shows none.
- [x] A press opens the Party of the Quest the row is about, with the room's own rules: one Party at a time (a User in another Party is asked as the room asks), and entering the Party another Holder opened at the same moment. The toast is the room's.
- [x] The press of the row itself still opens the party's card, as today.
- [x] No native file and no dependency changes; the push itself gets no button until the native Release.
- [x] App integration tests: the button shows and hides as above, a press opens the Party (the request's body), a User in another Party is asked first, and a press while another Holder's Party runs enters it.
- [ ] The pull request carries the app screens of the row with its button, before and after the press.

## Comments

### Decisions (2026-11-15)

- The row's Quest is the `questId` of `NoticeView`, read in the adapter from the time to leave's address (`/main?card=party:<questId>`). The row still opens its card, since a row with an address opens it first.
- "파티 켜기" stands under the row's time, at the row's end, as the secondary `md` Button: a list of 알림 may hold several, and the design system keeps `primary` to one per screen. A press on it does not press the row, as the Friend list's switch does not.
- It shows only when the User's Party (`MY_PARTY_KEY`) and the User's Quests (`QUESTS_KEY`) are known, the Quest is among them, and the User's Party is not that Quest's. A time to leave whose Quest ended still shows it; the main server's refusal says why in the room's words.
- A User in no Party opens at once, as the ticket's press does. A User in another Party is asked with the room's own question, `openAsk`, now shared by the room's "파티 활성화" and 알림, and on "활성화" leaves that Party, or ends the one they lead, first.
- The press calls the room's `openParty` from `useRoomActions`, so the request, entering the Party another Holder opened (409 `PARTY_EXISTS_FOR_QUEST`), and the toasts are the room's. The room's `otherPartyOf` is exported for 알림 rather than copied.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5). The session's own review and the pull request are counted under ticket 07.

- Agent time: about 13 minutes of work, an estimate from the transcript's timestamps; waits for the Mac's shared check slots are left out.
- Tokens: output 48,772; input 8,770,546, of which 8,430,253 were cache reads, 340,175 cache writes, and 118 uncached. Without cache reads: 389,065.
