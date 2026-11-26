# 10: 찾기 leaves out full 파티, and a card whose request waits offers 신청 취소

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-26, two items.

1. From UAT 1's feedback, never fixed: "자리가 다 찬 파티도 보여줌. → 참여하기 버튼도 활성화가 되어 있고, 눌렀을 때 그제야 '자리가 다 찼어요'를 보여줌. 애초에 목록에 안뜨거나 자세히 보기 전에 다 찬 파티라는걸 알 수 있게 수정". The user chose to leave full 파티 out of the list.
2. "파티를 이미 신청했는데 해당 파티의 참여 신청 버튼이 아직 활성화 되어있음 (모집 중인 파티 탭에서) 이거 신청 취소 버튼으로 만들고 버튼 디자인은 '초대' - '신청 취소' 버튼과 동일하게. 크기는 지금과 같게". The user's phone: `references/10-1-asked-card-now.jpg` (찾기, the card of a 파티 asked for still showing 참여 신청) and `references/10-2-asked-post-now.jpg` (its post, which already says 참여 신청을 기다리는 중이에요 with 신청 취소).

Positions are as of `origin/5.0/Main` 8020e2dc.

- `GET /quests/recruiting` (`main-server/src/quests/recruiting.service.ts`, `list`) gives every recruiting Quest the User does not hold, full ones included. The Assistant's search (`recruiting-search.ts`, `minPlacesLeft = 1`) and its candidates (`enterable`, `holders.length < capacity`) already leave full ones out. Entering a full one is refused with `QUEST_FULL`, "자리가 다 찼어요" (`mobile/src/features/quests/refusals.ts`).
- The app builds 찾기's cards from that list (`useFindPosts`, `src/features/party/use-party.ts`), and the Boards card, 전체 파티's counts and a board's posts from it too (`boardPosts`, `src/features/party/posts.ts`). Neither looks at the places left. A post carries `holders` and `capacity`.
- The same list feeds 파티 모집글 (`usePost`), which shows a Quest the User reached by a link or a chat card.
- A post already knows the User's request that waits: `role` is `{ kind: 'approval', requestId }` (`entryPost`). The post screen uses it (`post-screen.tsx`, 참여 신청을 기다리는 중이에요 and `신청 취소`). 찾기's card (`src/screens/party/post-card.tsx`, `CardButtons`) does not, and always shows 참여 신청.
- 초대's 보낸 신청 row withdraws with a `secondary` `신청 취소` that asks first (`invites-tab.tsx`, `withdrawAsk`: "‘…’ 참여 신청을 취소할까요?").

## What to build

- 찾기's 모집 중인 파티, the Boards card's count, 전체 파티's board counts and a board's posts leave out a recruiting Quest with no place left (`holders >= capacity`). It comes back once a place is free. The User's own posts on a board stay, full or not.
- The filter is in the app. The server's list stays as it is, so that 파티 모집글 still opens a full Quest from a link or a chat card.
- On a 찾기 card whose request waits, `신청 취소` stands where 참여 신청 stood, at the same size (full width beside `관심 없음`), in `secondary` as on 보낸 신청. It asks with the same sheet as 보낸 신청 before withdrawing; once withdrawn, the card shows 참여 신청 again. `관심 없음` stays.
- The ask moves to `use-party-actions.ts` and both 보낸 신청 and 찾기 use it.

## Must not break

- Joining an Open Quest and asking to join an Approval one from 찾기; the refusals, `QUEST_FULL` included, for a Quest that fills while the list is open.
- 보낸 신청's withdrawal and its ask; the post screen's 신청 취소.
- The chat's Quest cards, which use the same card without `신청 취소`.
- Tests: app `party-find`, `party-find-mock`, `party-boards`, `party-sent-requests` (`.integration`).

## Decided while building (2026-11-26)

- `find-tab.tsx` was at the lint's 300 lines, so 같이 할 사람을 찾는 중 (`Seekers`) moved to `screens/party/seekers.tsx`, unchanged.
- The card's button is named "<title> 신청 취소" for a screen reader, as `관심 없음` is.

## Acceptance criteria

- [x] A full recruiting Quest is not among 찾기's cards nor counted on the Boards card and its board; one with a place left is. (App integration test, which fails before the change.)
- [x] A card whose request waits shows `신청 취소`, not 참여 신청; it asks, withdraws, and the card shows 참여 신청 again. (App integration test, which fails before the change.)
- [ ] Checked on the user's phone after the app OTA update.
- [x] No native file changes; lint, format and types pass on the changed files.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 10 minutes, in one session (ticket, code, tests and pull request). This is an estimate: gaps under 5 minutes between transcript entries, summed.
- Tokens: input 8,460,589 (cache reads 8,377,492, cache writes 83,001, uncached 96); output 29,840. No subagents. Counted up to the writing of this entry, so the pull request's own messages are left out.
