# 02: Place markers without words, and Global Events at one Place as one marker

Parent: [P27 spec](../spec.md)
Status: resolved
Blocked by: None (can start immediately)

## What to build

The main screen's map draws no words under the markers of Places (Global Events, Quests, Parties, dining and shuttle); only Avatars keep a name under them. What a marker stood for is read in its card, as today.

Global Events at the same position become one marker. A Place with one Global Event keeps today's marker and card. Two or more make one marker with their count on its pin; pressing it opens a list of those events at that Place, and choosing one opens that event's card, which acts as a single event's card does. The merged marker's identifier comes from the Place, so that it stays the same as events come and go, and screen readers hear the Place and the count.

## Acceptance criteria

- [x] At the "names" level of detail, no Place marker carries words; Avatars still carry their names.
- [x] A Place marker's screen-reader name is unchanged.
- [x] Two Global Events at one position give one marker with the count 2; one event gives today's marker.
- [x] Pressing the merged marker lists its events; choosing one opens that event's card with today's actions.
- [x] The merged marker keeps its identifier when one of its events is added or removed, and becomes a single event's marker when one is left.
- [x] Screen tests over the mock cover the words, the merging and the list; the existing map and card tests pass unchanged or change only where they asserted words under Place markers, which the PR names.

## Check on a phone

- [ ] Zoomed in, no words appear under Place markers, and two events at one Place no longer overlap.

## Comments

### 구현 전 정리 (2026-10-08)

- 현재 동작: `mobile/src/screens/main/use-things.ts`의 `useThings`가 "names" 단계부터 모든 카드(사람, 행사, 파티, 퀘스트, 식당, 셔틀 정류장과 차량)에 `text`(짧은 이름)를 붙인다. `mobile/src/features/map/adapter.ts`의 `globalEventCards`는 Global Event마다 카드 하나, 마커 하나를 만들어 같은 위치의 행사들이 겹친다.
- 바꿀 동작: `text`는 사람(`mark.type === 'person'`, Avatar)에게만 붙인다. 마커의 `name`은 그대로 둔다. 같은 위치의 Global Event가 둘 이상이면, 위치에서 나온 id(`event-place:<위도>,<경도>`)를 가진 묶음 카드 하나가 마커가 되고 핀에 개수가 붙는다. 묶음 카드를 누르면 행사 목록이 보이고, 하나를 고르면 그 행사의 카드(오늘과 같은 버튼)가 열린다. 묶인 행사 카드는 지도에 따로 그려지지 않지만 카드 목록에는 남아서 선택(목록, 수업 줄 등)이 그대로 동작한다. 하나만 남으면 오늘의 단일 마커로 돌아간다.
- 고칠 곳: `features/map/adapter.ts`(묶음 카드, `CardView`에 묶음 정보와 행사 목록), `screens/main/use-things.ts`(words, 묶인 카드 숨김, 묶음 마커 선택 표시), `screens/main/card.tsx`와 `main-screen.tsx`(목록 행을 누르면 그 행사 카드 선택), 테스트 `main-markers-test` 등.

### 바꾼 기존 테스트

모두 Place 마커 아래 글자를 기대하던 단언이며, 이 티켓이 바꾸도록 허락한 것이다.

- `mobile/__tests__/main-markers-test.tsx`
  - "writes the given name under a person and a short name under a place" → "... and no words under a place": `저녁 약속`이 파티 마커 아래 보이던 단언을 `toBeNull()`로 바꿈.
  - "cuts a place's name at a word's end within 8 characters" → "writes no words under a Global Event or a Party, which keep their names for a screen reader": `AI 커리어`가 행사와 파티 아래 보이던 단언을 `toBeNull()`로 바꾸고, 마커가 이름(`EVENT`, `PARTY`)으로 계속 찾아지고 핀 모양인 것을 확인.
- `mobile/__tests__/main-lists-test.tsx` "brings the map to its place at the level where names show, ...": 행사 핀 아래 `AI 커리어`가 보이던 단언을 `toBeNull()`로, 주석을 "a pin without words"로 바꿈.
- `mobile/__tests__/dining-layer-test.tsx` "writes the restaurant under its pin from the "names" level" → "writes no words under its pins, even from the "names" level": 식당 이름 두 단언을 `toBeNull()`로 바꿈.
- `mobile/__tests__/shuttle-layer-test.tsx` "puts a dot on each stop, ... with the stop's name under it from the "names" level" → "... without the stop's name under it at any level": `자연대` 단언을 `toBeNull()`로 바꿈.

새 테스트: `mobile/__tests__/main-event-place-test.tsx` (가짜 메인 서버와 소켓 위에서, 한 장소의 행사 두 개가 마커 하나와 개수, 행사 하나는 오늘의 마커, 목록과 고른 행사의 카드와 `같이 갈 사람 찾기`, 행사가 늘고 줄 때 같은 마커로 카드가 열려 있고 하나만 남으면 단일 행사 마커).

### Agent usage (2026-10-09)

- Agent time: about 2 hours (the resumed implementer) in the resumed session (2026-10-08 to 09), an estimate. Much of it was spent waiting for the shared test slot while the Mac was short on memory. The earlier session, which was force-quit, is not counted: its usage was lost.
- Tokens: about 106 thousand in all, all subagents: the resumed implementer (70 thousand). The subagent reports give only totals, so input and output, and the cache reads and writes, cannot be shown separately. Included is a ninth of the shared code review and review fixes (about 36 thousand tokens and 2.5 minutes). The orchestrator's own tokens are not counted.
