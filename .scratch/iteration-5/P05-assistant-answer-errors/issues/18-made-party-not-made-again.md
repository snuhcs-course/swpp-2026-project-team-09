# 18: A 파티 already made is never made again to change it

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server first, then the app's OTA update that sends `madeQuestId` (P04): the server refuses a message with a field it does not know.

## What happens now

Found in use (feedback 2026-11-22, item 6, three runs of three): the User made a 파티 with 만들기, then asked "방금 만든 파티 19시로 수정해줄 수 있어? 새로 만들지 말고".

- The app sends the made Proposal back as it was proposed. The model reads `[Proposal shown: …]` and nothing says it was made.
- The model calls proposeQuest at 19:00, and the reply carries a new Proposal card. Its 만들기 would make a second 파티 beside the first.
- The reply says the 파티 changed ("시작 시간을 내일 19시로 바꿨어요"), which it did not.

## What to build

- A Proposal sent back may carry `madeQuestId`, the Quest 만들기 made of it. The app sets it once made (P04).
- The model reads it as `[Proposal made: {"questId", …values}]`, not `[Proposal shown: …]`.
- While the last Proposal sent back was made, proposeQuest answers `{ "result": "made", "questId", "reason" }` and puts no card in the reply. The reason tells the model to say the 파티 is already posted (이미 올린 파티예요), never that it changed, and that it is changed with 수정 in its room in 내 파티.
- A rule says the same. proposeQuest takes `another: true` when the User asks for another 파티 beside the made one, and then proposes as before.
- Changing the made 파티 in place is ticket 17's slice 2 (the 파티 rows of its case table).

## Acceptance criteria

- [x] A conversation whose last Proposal was made: the model reads `[Proposal made: …]` with the Quest's id, proposeQuest answers `made`, and the reply carries no Proposal. (`assistant-made-proposal.integration.test.ts`, which answered 400 before the change.)
- [x] With `another: true`, proposeQuest proposes as before.
- [x] A Proposal sent back without `madeQuestId` is read and changed as before. (`assistant-proposals.integration.test.ts`.)
- [x] The eval case `follow-up-change-made-party` scores a reply that calls nothing or gets `made`, names 수정, and never says the 파티 changed.
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-22)

Tickets 18 to 26 were done together in one session, 01:30–04:00 on 2026-11-22, with PRs 425 to 433; these figures are the whole batch's, not this ticket's alone.

- Agent time: about 2.2 hours (estimate: gaps under 5 minutes between transcript entries, summed).
- Tokens: input 220,838,000 (cache reads 220,158,000, cache writes 679,000, uncached 1,000); output 331,000. Without cache reads, 1,010,000.
