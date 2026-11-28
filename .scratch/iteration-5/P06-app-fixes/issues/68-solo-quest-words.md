# 68: a solo Quest's form names a Quest, and the mock opens the room of a Quest its Plans made

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: #796 (ticket 67).

Native files: none. Releases: an app OTA update only.

## What happens now

Found while taking ticket 67's pictures (2026-11-29).

- **The form's words.** The form of a Quest taken alone still says "파티 설정" and "어떤 파티인지 소개해 주세요". This holds for 퀘스트 수정 and for the making form under 비공개 with nobody invited.
- **The mock's room.** A Quest the mock's Plans made ("일정에 넣기" alone) is listed in 내 퀘스트, but its room asks `getQuest`, which looked only at the mock's fixed Quests. The room got 404 and closed at once. The real path opens it: the server serves every Quest the User holds.

## What to build

- While the form makes or keeps a Quest taken alone (`state.alone`), it shows "퀘스트 설정" and "어떤 퀘스트인지 적어 주세요". The words switch with the button.
- The mock's `getQuest` also looks among the Quests its Plans made.

## Acceptance

- [ ] Under 비공개 with nobody, and on 퀘스트 수정, the form says 퀘스트 설정 and the Quest's grey words (integration tests, failing before).
- [ ] The mock answers `getQuest` for a Quest its Plan made (integration test, failing before).

## Comments
