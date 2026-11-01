# 03: Tutorial app: button, pager, quest list, sheets and the 내 정보 row

Parent: [P06 spec](../spec.md) ("The tutorial": App)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A freshman sees "새내기 튜토리얼 시작하기" at the bottom of the main screen. It opens the pager "새내기 튜토리얼 n/N" with ◀ ▶, where they start the quests that interest them. Started quests sit on top of the quest list under "새내기 튜토리얼". A quest's sheet shows its text, places ("지도에서 보기") and links, and 완료했어요 completes a button quest with its fixed message, then the pager moves on to the next quest not started, or says "튜토리얼을 모두 마쳤어요" after the last. "튜토리얼 그만하기" ends it, and the 내 정보 row turns it on again with progress kept. See the spec's App section and the wireframe frames it names (MainTutorialStart, MainTutorialList, MainTutorialSheet, MainTutorialOk, MainTutorialNext, ProfileTutorial).

This ticket builds against the tutorial API contract in the spec (the `GET /tutorial` body and the five POSTs) with mocks. When ticket 02 lands, it switches from the mocks to the real API; whichever of 02 and 03 merges second makes that switch and checks it on the dev server.

The 관정 quest's check is ticket 05. Here the 관정 sheet shows its text, places and links with 나중에, 어시스턴트에게 예약 부탁하기 and the skip "이미 예약 및 이용해본 적이 있어요" (complete `skipped`, then the completionMessage), all JS only. 완료했어요 and the check states come with ticket 05, which needs the native library session. So the tutorial can be finished on a build without it.

## Acceptance criteria

- [x] The start button ("새내기 튜토리얼 시작하기", flag icon, bottom-left above the footprints row) shows in `available`, and in `active` while some quest is not started. It is hidden while a card, the chat or the replay is open, and in every other state.
- [x] The pager: kicker "새내기 튜토리얼 n/N", title and brief, ◀ ▶ disabled at the ends, status chip 진행 중 / 완료, "퀘스트 시작" (or "내용 보기" for a started quest), "튜토리얼 그만하기" and 닫기. It opens on the first quest not started.
- [x] 퀘스트 시작 calls start, and the quest appears on top of the quest list in the group "새내기 튜토리얼" with "새내기 튜토리얼 · n/N", the title and "완료 조건 · {condition}". Several can be started.
- [x] The sheet shows the dots, the title, the body's paragraphs, the 완료 조건 box, one "지도에서 보기" per place (focuses the main map on the Place or the point) and each link (opened with `expo-web-browser`), with 나중에 and 완료했어요 for button quests.
- [x] Completing a button quest shows its completionMessage in the sheet's Assistant bubble, then 퀘스트 완료 calls complete and opens "퀘스트 완료! 다음 퀘스트 · n/N", or after the last quest "새내기 튜토리얼 완료 / 튜토리얼을 모두 마쳤어요 / 이제 SNU Now를 자유롭게 써 보세요. / 닫기".
- [x] The 관정 sheet has 나중에, 어시스턴트에게 예약 부탁하기 (closes the sheet, opens the chat and sends "관정도서관 7층 열람실에 한 자리 예약해줘") and the skip, as described above.
- [x] The 내 정보 row shows each state's subtitle and buttons exactly as the spec lists them (진행하기 + ✕ for `off`, 끄기, 그만하기, 진행하기, "모두 완료했어요").
- [x] The app keeps no copy of the tutorial's text; all of it comes from `GET /tutorial`.
- [x] Tests, named by ADR 0007, integration against the mocks: the pager and ◀ ▶; 퀘스트 시작; several started; the quest-list group; the sheet with places and links; button completion; the next-quest pager; all done; 그만하기 and 진행하기; the 관정 skip and 예약 부탁; the 내 정보 row in each state. State-to-visibility logic gets unit tests.
- [x] No native file changes (CLAUDE.md § The app's native files); the app-fingerprint CI job reports no native change.

## Comments

- Built against the spec's contract with the mock (`mobile/src/api/mock/tutorial.ts`, content in `mock/data/tutorial.ts`). The switch for ticket 02 is one constant: `TUTORIAL_SERVED` in `mobile/src/api/server/tutorial-client.ts`, which `serverClient` reads; the client and its answer check are tested against the fake main server (`__tests__/api/server-tutorial.integration.test.ts`). Whichever of 02 and 03 merges second sets it to true and checks the tutorial on the dev server.
- Two fields the app reads beyond the spec's body, for ticket 02 to serve or to settle: `rowHidden` (optional, the ✕ of the 내 정보 row; the `{ state, quests }` body cannot tell it apart from `off`), and an optional `label` on a `{ place }` entry (Place 4 shows as "우리은행 (4동)"). `body` is read as a list of paragraphs, as the YAML holds it.
- The mock's Places gained 4, 62-1, 67, 68 and 151 from the shared seed, for 지도에서 보기.
- The start button stays hidden while the shuttle notice is shown (it would cover the map's credit there), besides a card and the chat. The app has no 발자국 replay yet. When the start button shows, the map's credit and the friend list's window end above it.
- The pager stays open after 퀘스트 시작 (the chip turns 진행 중 and the button 내용 보기), so several quests can be started in one go. After a completion it goes to the next quest not started, else to a started one, else "튜토리얼을 모두 마쳤어요".
- 내 정보's "available, eligible by default" reads the admission year now; 소속 교환학생 counts once ticket 01's `affiliation` is in the profile.

### Agent usage (2026-11-01)

- Agent time: about 3 hours 30 minutes, an estimate, one implementer subagent; much of it waiting on test runs slowed by the parallel P06 worktrees' test runs.
- Tokens: an estimate, input about 9,000,000 (cache reads about 8,600,000, cache writes about 400,000, uncached under 10,000); output about 70,000.
