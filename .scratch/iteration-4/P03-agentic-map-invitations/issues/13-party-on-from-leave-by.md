# 13: "파티 켜기" on the time to leave

Parent: [P03 spec](../spec.md); the design's section 5 ("Parties and invitations": the Assistant suggests the moment by adding a "파티 켜기" button to the leave-by notification) and section 6.1 (Together 10)
Status: ready-for-agent
Blocked by: package D's time to leave in "알림" (P05 ticket 04, merged)

## What to build

The row of "알림" that tells a User when to leave for a party ("12:18 나설 시각", then "지금 나서요") gets a "파티 켜기" button. A press turns the party's Party on, as the room's activation does today: it opens the Party of that Quest, or enters the one another Holder opened. The User stays where they are, and a toast says what happened. The Assistant never turns a Party on by itself. This is wireframe row "1. 배고파", board 같이 ⑭, and row "11. 알림 모음" in the list.

## Acceptance criteria

- [ ] A time-to-leave row of a Quest whose Party is not on for the User shows "파티 켜기"; a row whose Party the User is already in shows none.
- [ ] A press opens the Party of the Quest the row is about, with the room's own rules: one Party at a time (a User in another Party is asked as the room asks), and entering the Party another Holder opened at the same moment. The toast is the room's.
- [ ] The press of the row itself still opens the party's card, as today.
- [ ] No native file and no dependency changes; the push itself gets no button until the native Release.
- [ ] App integration tests: the button shows and hides as above, a press opens the Party (the request's body), a User in another Party is asked first, and a press while another Holder's Party runs enters it.
- [ ] The pull request carries the app screens of the row with its button, before and after the press.

## Comments
