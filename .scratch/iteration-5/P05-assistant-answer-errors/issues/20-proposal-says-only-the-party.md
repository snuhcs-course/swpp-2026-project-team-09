# 20: A 파티 proposed after a search speaks only of itself

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [19](19-proposal-over-own-time.md), whose answer of a Proposal this adds to.

Native files: none. Releases: the main server.

## What happens now

Found in use (feedback 2026-11-22, item 2b), after P02 ticket 01 (pull request 384): asked to make an open 파티, the Assistant first searches for one to join, and when none fits it proposes. P02's rule says to speak only of the proposed 파티, but a reply still opens with the search in about a third of first turns:

- "같은 시간대에 맞는 파티는 없었어요."
- "근처에 맞는 파티는 없었어요."
- "참고로 같은 시간대에 올라온 진로 파티 중 코딩 스터디는 없었어요. 83동 라운지 스터디가 있지만 코딩 스터디가 아니라서 빼 뒀어요."

It follows a search that answered none, and one that found 파티 the model judged unfit. The rule is in the system prompt only, far from the answer the model writes its words from.

## What to build

- proposeQuest's answer of a Proposal carries a `note`, where the model reads it as it writes: speak only of this 파티, and never of a search or of 파티 found, not found or not fitting.
- P02's rule also names what was found and did not fit, besides "that you looked" and "that none was found".

## Acceptance criteria

- [ ] proposeQuest's answer of a Proposal carries the note. (`assistant-proposals.integration.test.ts`, which fails before the change.)
- [ ] The eval cases `recruit-coding-study-says-only-the-party` and `recruit-badminton-says-only-the-party` pass more often than before the change, and P02's revised cases (`eval/p5/cases/join-or-recruit-revised.yaml`) do not get worse.
- [ ] Lint, format and types of the main server pass.
