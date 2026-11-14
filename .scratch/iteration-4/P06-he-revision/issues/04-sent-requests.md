# 04: Sent requests in the 파티 tab, with withdraw

Parent: [spec](../spec.md) ("Sent requests")
Status: ready-for-agent
Blocked by: None (can start immediately).
Before the acceptance tests: yes (H1, H2, severity 3). Done when the pull request into `4.0/Main` is open; merging is the team's call.
Native files: no
PR assignee: Jaehyun0320

## What to build

The 파티 tab gets a "보낸 신청" section beside the invitations received. Each row shows the Quest's post title and opens that post when tapped. Each row has "신청 취소": it asks for confirmation, withdraws, and toasts "신청을 취소했어요". If the Leader answered at the same moment and the server refuses, the row says why in plain words. Requests made from a 파티 card in chat appear in the same list. No server change: the list reads the existing sent-requests endpoint and withdraw uses the existing one.

## Acceptance criteria

- [ ] The section lists every waiting request, each with the post's title; tapping opens the post.
- [ ] Withdraw confirms first, then toasts "신청을 취소했어요", and the row leaves the list.
- [ ] Each refusal when the Leader answered first shows a plain sentence.
- [ ] A request sent from a chat card appears without extra work.
- [ ] No server change.
- [ ] Tests (ADR 0007): app integration over a fake server for the rows, opening the post, withdrawing and the refusal (prior art: `party-mine`, `party-invites`).
- [ ] The H1 and H2 rows of `he-revision-log.md` get this pull request. H2 is recorded as an existing feature made easy to find.

## Comments
