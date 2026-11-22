# 01: The map's friend and Quest lists go, and the 퀘스트 chip opens the Quest list

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received: "왼쪽위, 오른쪽위 퀘스트랑 친구 리스트를 삭제하고 이를 펼치고 접을 수 있는 화살표 버튼도 삭제. 각 목록은 친구와 퀘스트 탭을 눌러 들어가서 볼 수 있게 함" (`references/01-1-map-now.webp`).

- The 친구 chip at the top left (`FriendPill`, `mobile/src/screens/main/friend-list.tsx:38-58`, label "친구 목록 열기") already opens the friend panel (`setPanelOpen(true)` at :133-138, `FriendPanel` in `friend-panel.tsx`). Under it stand up to three Friend rows (:148), open at start (`useState(true)` at :125) and folded by a chevron (`CollapseButton`, :139-146).
- The 퀘스트 chip at the top right takes no press (`quest-list.tsx:43-44`). Only its round ↗ button (icon `expand`, label "퀘스트 전체 화면으로 열기", :57-65) opens the Quest list on the whole screen (`router.push('/quests')`, :162-164). Under the chip stand today's Quest rows, a chevron (:152-159) and "오늘 일정 없음" when there are none (:174).
- `CollapseButton` and `RowWindow` (`list-parts.tsx`) serve only these two lists. So do `friendsWidth`, `underLists`, `listRows` and `listWindow` in `layout.ts` (:81-125), and the row looks of `quest-list-rows.ts`. `mobile/README.md` (around :577-595) describes the rows' window.
- `main-screen.tsx` places both lists in `Lists` (:224-231), which gives way to a 식당's card at the top and to the answer frame (`listsHidden`, :195).

## What to build

- Both chips stay where they are. The 친구 chip opens the friend panel, as now.
- The 퀘스트 chip opens the Quest list on the whole screen (`/quests`) at a press. The ↗ button goes, so the two chips look alike: a label, a count, nothing else. Its screen reader name follows the 친구 chip's: "퀘스트 목록 열기".
- The Friend rows, the Quest rows, both chevrons and "오늘 일정 없음" go, with the code only they use (`list-parts.tsx`, `quest-list-rows.ts` if nothing else reads it, the dead parts of `layout.ts`) and the README's lines on them.
- The chips give way where the lists did: a 식당's card at the top, the answer frame.

## Must not break

- `FriendPanel` is mounted inside `FriendList` (`friend-list.tsx:149-158`). It keeps opening and closing as now, and a Friend shown from it still moves the map to them.
- `useAskedQuest` (`quest-list.tsx:125-137`) opens a Quest's card when the Quest list returns with `/main?quest=` (`screens/quests/quests-screen.tsx:54`). It must stay mounted once the rows are gone.
- `listsTop` and `LISTS.top` in `layout.ts` stay: the answer pill and the time bar stand under them (`answer/answer-pill.tsx:63`, `answer/time-bar.tsx:42`, `answer-padding.ts`, `answer/frame-card.tsx`, `answer/question-list.tsx`).
- Tests that find a Friend or a Quest by its row or a chevron by its label: `main-lists`, `main-controls`, `main-room`, `main-keyboard-down`, `dining-layer`, `shell`, `live`, `map-ageing`, `friend-card-from-list`, `friend-seen-card`, `friend-seen-card-party`, `features/screen-data`, `features/screen-data-failure`, `server-app` (all `.integration`), and `main-layout.unit` for `listRows`; the shared constants in `__tests__/support/lists.ts`. Each reaches the same thing another way (the friend panel, the Quest list, the map's marker), or drops the row step where the row was only on the way. A test whose subject was the rows (`main-lists`, `listRows`' cases) goes with them. Tests that find the chips by their label (`friend-panel`, `quests-screen`, `quest-groups`, `friends-*`, `me`, `swipe`, `private-party`, `invitation-card`, `answer-frame`, `tutorial-list`) keep working.

## Acceptance criteria

- [ ] A press on the 퀘스트 chip opens the Quest list on the whole screen, and the map shows no ↗ button. (Integration test, which fails before the change.)
- [ ] The map shows no Friend row, no Quest row, no chevron and no "오늘 일정 없음". (Integration test.)
- [ ] The 친구 chip still opens the friend panel; returning from the Quest list with a Quest still opens its card on the map. (Integration tests.)
- [ ] The map's top on a phone with the mock build, with and without a 식당's card open; the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
