# 06: The map: quiet marks, new layer pins, a glass friend panel, no "가까이 보기"

Parent: [A04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the glass layer), for the glass parts only. The rest can start immediately.

Native files: `Things.kt` of the map module (see Comments). Releases: a native Release, `version` 1.0.5.

## What happens now

- Quest rows (`screens/main/quest-list.tsx`, and the Quest screen) take their tone from `questTone` (`design-system/tokens.ts`): class grey, open party blue #2F6FC0, closed party #B63A07.
- Map marks (`design-system/map-pin.tsx`, `screens/main/use-things.ts`, `map/marker-looks.tsx`):
  - 공식 행사 navy calendar, 파티 #B63A07 users, 퀘스트 #865600 flag. The 비공개 kind is never put on the map.
  - Zoom levels (`map/campus.ts`): dots (16) at the overview, 40pt pin heads with a white border and a tail from 1.6×, names from 2.4×.
  - Selected: scale 1.18 with an 18% navy halo; a dot grows 4 and gets a ring.
  - A count is a small badge.
  - Marks are drawn by our JavaScript into pictures (`map/marker-images.tsx`) that the native map places.
- Layers (`screens/main/layers.tsx`): 식당 #B8336A, 셔틀버스 #6B46C1, 공부공간 #0369A1.
  - The 식당 pin (`MapRestaurant`) is a 22pt pink round with "학".
  - Study spaces are rounded squares with a book icon, grey when the User cannot use the building, clustered at the overview (`map-study-cluster.tsx`).
- Friend panel (`screens/main/friend-panel.tsx`):
  - A white side panel.
  - Each row has a 44pt round calendar button, "{name}님과 파티 만들기".
  - The footer is a "공유 설정" link and a full-width secondary "+ 친구 추가".
- The marker card (`screens/main/card.tsx`) shows "가까이 보기" (`LOOK_CLOSER`) below the names level, beside its main button. `friend-profile.tsx` mentions it in comments.
- "친구 N" and "활성 파티" are solid navy pills.

## What to build

Follow the changelog's § 4-1, § 4-3 to § 4-6 and § 5-5's last line (`references/changelog-11-24.md`) and the canvas boards Main, ZoomCards, MainLayers, MainFriends (<https://claude.ai/artifact/NgBrKLs1RhN9tVywM6376Y>). The 셔틀 layer is out of scope.

Can start now:

- Quest rows, on the map's Quest list and on the Quest screen:
  - One navy (#001A72) icon round, a person icon for 공개 and a lock for 비공개.
  - Near-black words above ("공개 파티 · 4명").
  - The blue and orange tones go. The icon carries 공개/비공개 for a screen reader.
- Map marks for 행사, 파티 and 퀘스트 become light tags:
  - A line icon in the kind's colour (행사 navy calendar, 파티 orange people, 퀘스트 brown flag) on a 14% tint of that colour.
  - At the map's three zoom levels: a 20 round, then a 26 round, then the icon with a name pill.
  - The chosen mark gets a navy border and ring. The count badge stays as it is.
- Quest pins on the map go to about 70% opacity, with a lighter white border and shadow.
- 식당 pin: a 22 coral (#EE6A4C) round with a white fork and knife and a triangular tail.
- 공부공간 pin:
  - A 22 sky (#3A9AE6) round with a white book and a triangular tail.
  - Its cluster is a light sky see-through round with the count in a sky round.
  - The grey "cannot use" variant stays.
- Draw both pins ourselves from the canvas's shape and colours. Use no other map app's images.
- Layer buttons: 식당 coral, 공부공간 sky. 셔틀버스 stays.
- The marker card loses "가까이 보기" everywhere, with its constant and the comments that mention it.
- "친구 N" and "활성 파티" stay solid navy.

After ticket 01 is merged:

- The pin head is 80% and its name label is glass.
- The friend panel is `inner`-level glass (80%) over the map.
  - Its footer loses its white ground and joins the panel.
  - "친구 추가" is a glass button, and so is each row's calendar button.

Check on the emulator that translucent marks come out right in the pictures the native map places. If they do not, say so in Comments and ask before working around it.

## Must not break

- Pressing a mark still opens its card, and the card's main button still works.
- Layers still turn on and off and are remembered (P06-03).
- Do not run at the same time as P06-05 (the User's own marker): both change `map-pin.tsx`. P06-01 (the map's lists) changes `friend-list.tsx` and `quest-list.tsx`. Whichever goes second merges `5.0/Main` first.
- The Assistant's answer parts (`screens/main/answer/`, `design-system/map-answer*`) are ticket 02's.
- Tests: `design-system/map-pin.unit`, `marker-looks.unit`, `marker-images.unit`, `main-card`, `layers`, `friend-panel`, `friend-panel-card`, `main-markers`, `catalogue` (`.integration`), and the Quest screen's tests.

## Acceptance criteria

- [x] No marker card shows "가까이 보기". (`main-card`, which fails before the change.)
- [x] Quest rows tell 공개 from 비공개 by an icon a screen reader names. (Unit or integration test.)
- [ ] Layers, the friend panel and pressing marks work as before. (Existing tests.)
- [x] "Before" and "after" emulator screens go in the pull request: the map at each zoom level with 행사, 파티 and 퀘스트 marks; the 식당 and 공부공간 layers; the friend panel; a marker card; the Quest list.
- [ ] ~~No native file changes~~ (one, agreed: see Comments); lint, format and types pass on the app.

## Comments

### The see-through marks and a native change (2026-11-26)

- On the emulator the map's tags came out grey in the pictures the native map places: white at 80% looked like grey at 80%, though the map showed through. The quest rounds and the friend panel, which are views and not pictures, were right.
- The cause: the Android module read the picture with its colours already multiplied by their alpha, and Kakao's SDK multiplies them again. `Things.kt` now hands the SDK the picture with straight alpha. Checked on the emulator after a new native build: the tags are white at 80% with the map's words faintly through.
- Asked first, as the ticket says. The user chose the native fix over drawing the tags opaque, and to raise `version` to 1.0.5 in this pull request. The native Release after the merge is the user's.
- iOS (`Things.swift`) was not looked at.

### Choices beyond the ticket

- A place where several kinds stand together is the same light tag, with a round for each kind.
- From the "names" level a 행사's, a 파티's, a 퀘스트's and a group's short name is in its tag, drawn into its picture, as the canvas does. A person's name stays the map's own text.
- Tags sit on their middle, as the canvas places them; pins with a tail still stand on their tip.
- The 70% look is on both the 퀘스트 tags on the map and the Quest list's rounds over the map.
- 강의 keeps its grey round: the changelog's § 4-1 unifies only the 파티 rounds.

### Agent usage (2026-11-26)

Estimates: agent time is the gaps under 5 minutes between transcript entries, summed, so waiting for a person, for the heavy-job lock another session held, and for the native builds is left out. The two subagents are the code review's Standards and Spec reviewers. Counted up to the writing of this entry, so the review watch after the pull request is left out.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 06 (the code, the tests, the emulator checks and the native fix, the code review, the pull request), with its two subagents | about 56 minutes | 88,261,771 | 87,657,550 | 603,613 | 608 | 154,972 |

Without cache reads, the input is 604,221.
