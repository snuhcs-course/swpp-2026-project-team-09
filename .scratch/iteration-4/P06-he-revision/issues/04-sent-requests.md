# 04: Sent requests in the 파티 tab, with withdraw

Parent: [spec](../spec.md) ("Sent requests")
Status: ready-for-agent
Blocked by: None (can start immediately).
Prepared before the acceptance tests: yes (H1, H2, severity 3). Done when the pull request into `4.0/Main` is open; whether it merges and ships before an acceptance test is decided by the team later.
Native files: no
PR assignee: Jaehyun0320

## What to build

The 파티 tab gets a "보낸 신청" section beside the invitations received. Each row shows the Quest's post title and opens that post when tapped. Each row has "신청 취소": it asks for confirmation, withdraws, and toasts "신청을 취소했어요". If the Leader answered at the same moment, the withdraw fails with the same not-found whether they accepted or declined, since both delete the request. The app then reads the User's Quests again and says "이미 파티에 들어갔어요" when the User now holds the Quest, or "파티장이 신청을 받지 않았어요" when not. Requests made from a 파티 card in chat appear in the same list. No server change: the list reads the existing sent-requests endpoint and withdraw uses the existing one.

## Acceptance criteria

- [ ] The section lists every waiting request, each with the post's title; tapping opens the post.
- [ ] Withdraw confirms first, then toasts "신청을 취소했어요", and the row leaves the list.
- [ ] When the withdraw fails because the Leader answered first, the app refetches the User's Quests and shows "이미 파티에 들어갔어요" or "파티장이 신청을 받지 않았어요", and the row leaves the list.
- [ ] A request sent from a chat card appears without extra work.
- [ ] No server change.
- [ ] Tests (ADR 0007): app integration over a fake server for the rows, opening the post, withdrawing and the refusal (prior art: `party-mine`, `party-invites`).
- [ ] The H1 and H2 rows of `he-revision-log.md` get this pull request. H2 is recorded as an existing feature made easy to find.

## Comments
