# 03: Tutorial app: button, pager, quest list, sheets and the 내 정보 row

Parent: [P06 spec](../spec.md) ("The tutorial": App)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A freshman sees "새내기 튜토리얼 시작하기" at the bottom of the main screen. It opens the pager "새내기 튜토리얼 n/N" with ◀ ▶, where they start the quests that interest them. Started quests sit on top of the quest list under "새내기 튜토리얼". A quest's sheet shows its text, places ("지도에서 보기") and links, and 완료했어요 completes a button quest with its fixed message, then the pager moves on to the next quest not started, or says "튜토리얼을 모두 마쳤어요" after the last. "튜토리얼 그만하기" ends it, and the 내 정보 row turns it on again with progress kept. See the spec's App section and the wireframe frames it names (MainTutorialStart, MainTutorialList, MainTutorialSheet, MainTutorialOk, MainTutorialNext, ProfileTutorial).

This ticket builds against the tutorial API contract in the spec (the `GET /tutorial` body and the five POSTs) with mocks. When ticket 02 lands, it switches from the mocks to the real API; whichever of 02 and 03 merges second makes that switch and checks it on the dev server.

The 관정 quest's check is ticket 05. Here the 관정 sheet shows its text, places and links with 나중에, 어시스턴트에게 예약 부탁하기 and the skip "이미 예약 및 이용해본 적이 있어요" (complete `skipped`, then the completionMessage), all JS only. 완료했어요 and the check states come with ticket 05, which needs the native library session. So the tutorial can be finished on a build without it.

## Acceptance criteria

- [ ] The start button ("새내기 튜토리얼 시작하기", flag icon, bottom-left above the footprints row) shows in `available`, and in `active` while some quest is not started. It is hidden while a card, the chat or the replay is open, and in every other state.
- [ ] The pager: kicker "새내기 튜토리얼 n/N", title and brief, ◀ ▶ disabled at the ends, status chip 진행 중 / 완료, "퀘스트 시작" (or "내용 보기" for a started quest), "튜토리얼 그만하기" and 닫기. It opens on the first quest not started.
- [ ] 퀘스트 시작 calls start, and the quest appears on top of the quest list in the group "새내기 튜토리얼" with "새내기 튜토리얼 · n/N", the title and "완료 조건 · {condition}". Several can be started.
- [ ] The sheet shows the dots, the title, the body's paragraphs, the 완료 조건 box, one "지도에서 보기" per place (focuses the main map on the Place or the point) and each link (opened with `expo-web-browser`), with 나중에 and 완료했어요 for button quests.
- [ ] Completing a button quest shows its completionMessage in the sheet's Assistant bubble, then 퀘스트 완료 calls complete and opens "퀘스트 완료! 다음 퀘스트 · n/N", or after the last quest "새내기 튜토리얼 완료 / 튜토리얼을 모두 마쳤어요 / 이제 SNU Now를 자유롭게 써 보세요. / 닫기".
- [ ] The 관정 sheet has 나중에, 어시스턴트에게 예약 부탁하기 (closes the sheet, opens the chat and sends "관정도서관 7층 열람실에 한 자리 예약해줘") and the skip, as described above.
- [ ] The 내 정보 row shows each state's subtitle and buttons exactly as the spec lists them (진행하기 + ✕ for `off`, 끄기, 그만하기, 진행하기, "모두 완료했어요").
- [ ] The app keeps no copy of the tutorial's text; all of it comes from `GET /tutorial`.
- [ ] Tests, named by ADR 0007, integration against the mocks: the pager and ◀ ▶; 퀘스트 시작; several started; the quest-list group; the sheet with places and links; button completion; the next-quest pager; all done; 그만하기 and 진행하기; the 관정 skip and 예약 부탁; the 내 정보 row in each state. State-to-visibility logic gets unit tests.
- [ ] No native file changes (CLAUDE.md § The app's native files); the app-fingerprint CI job reports no native change.
