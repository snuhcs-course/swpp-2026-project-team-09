# 04: The 파티 tab: thin 내 파티 cards, simpler recruit cards, form icons

Parent: [A04 spec](../spec.md)
Status: done
Blocked by: None (can start immediately).

Native files: none. Releases: an app OTA update only.

## What happens now

내 파티 card (`screens/party/mine-card.tsx`, data in `features/party/mine.ts`):

- Tinted by kind: 비공개 grey, 공개 light blue. 1px border, radius 16, padding 16.
- A badge row:
  - a kind pill (lock "비공개 파티" / users "공개 파티");
  - a status Badge ("멤버 N명", "모집 중 · 3/8명", "… · 초대 N명 대기", "활성화 중 · N명 위치 공유");
  - an event Badge, when the Quest points at an Event.
- An 18pt title.
- A "다음 일정" box: a round with a route icon, a when line and a what line.
- Up to 4 faces with "나, 정하은 외 2명".
- A red circle in the top right counting waiting join requests.
- Own activation: a white card with a 2px navy border and a ring.
- Someone else's activation: a navy band "OO님이 활성화했어요" with 거절 and 참여. After declining, a light blue band "활성화 중 · 참여하지 않는 중" with 참여.
- Group headers (`mine.ts`): 활성화 중, 활성화 알림, 다른 활성 파티, 오늘 …

찾기 (`screens/party/find-tab.tsx`):

- The "모집 중인 파티" header has "전체 보기 ›", which opens `/boards` ("전체 파티", `boards-screen.tsx`).
- Recruit card (`post-card.tsx`):
  - an orange "파티" Badge, an optional event Badge, and "3/8명" on the right;
  - an 18pt title and a 2-line body preview, with a 64×64 photo;
  - time and place on separate lines;
  - faces, "민수 외 2명 · 친구 1명 포함" and "자세히 ›";
  - "관심 없음" and "참여하기"/"참여 신청".

파티 form (`screens/party/form/party-form-screen.tsx`, `field-head.tsx`):

- Fields: 사진, 관련 행사, 제목, 본문, 언제, 인원, 어디서, 공개 범위, 게시판 (공개 only), 친구 초대, 태그.
- Labels are plain 14pt text.
- The 관련 행사 picker (`event-field.tsx`) is a FullScreenPanel titled "행사", with 진로/이벤트/축제 tabs, a SearchField and design-system `EventCard`s.

## What to build

Follow the changelog's § 1-1, § 1-3 and § 1-4 (`references/changelog-11-24.md`) and the canvas boards Party, PartyMine, PartyCreate (<https://claude.ai/artifact/NgBrKLs1RhN9tVywM6376Y>):

- 내 파티 card:
  - One line high: the title, the count on the right, and "when · where" below from the next step. "장소 미정" when there is no place.
  - The count is "3/8명" while recruiting, otherwise "N명".
  - Gone: the kind pill, the status badge, the event badge, the faces and the "다음 일정" box. Sent invitations still waiting are not shown on the card.
  - The red join-request circle stays.
  - Both kinds: a white card with a grey border. The kind is a grey drawn icon with a small "공개"/"비공개" under it, centred on the card's height. 공개 is two people, the front dark grey and the back light grey. 비공개 is a lock with no keyhole.
  - Own activation keeps its navy border and its place under "활성화 중".
  - Another's activation: the band goes, and one line reads "활성화 중 · {name}" beside a red blinking light. After declining it reads "활성화 중 · 참여 안 함". 거절 is small grey text and 참여 a white outlined button. The "활성화 중" header gets the red light too. With reduce-motion on, the light does not blink.
- 찾기:
  - "전체 보기 ›" becomes a rounded "전체 게시판 ›" button.
  - Under the recommended posts, a light navy card with a clipboard icon reads "식사 · 진로 · 취미 · 공연 모집글 N개 둘러보기". N is the open posts across the four Boards, and the card opens `/boards`.
  - The recruit card loses the "파티" Badge, the body preview and "자세히 ›".
  - Its count moves to the end of the faces line, and time and place share one line, cut with "…".
  - Its photo is 52, centred beside the title and time lines, and its vertical padding shrinks.
  - A 행사 badge, when there is one, is the only badge on top. The buttons stay.
- 파티 form: a navy icon left of each field's name. 사진 camera, 관련 행사 ticket, 제목 "T", 본문 lines of text, 언제 clock, 인원 people, 어디서 pin, 공개 범위 eye, 게시판 clipboard, 친구 초대 person-plus. 태그 gets none. Draw any icon the design-system `Icon` lacks as a line icon in its style.
- 관련 행사 picker:
  - Titled "관련 행사 고르기", with a grey rounded search field.
  - Its rows are shaped like the 행사 tab's: date column, rule, host, a bold one-line title, "time · place".
  - The picked row is light blue with a navy check.
  - The picker's tabs stay.

When a call can only be made by looking (for example the activation line's exact place on the card), show the user a mock-up first.

## Must not break

- Every action on the cards: opening a 파티, 거절/참여 on an activation, answering join requests, 관심 없음, 참여하기/참여 신청.
- The 내 파티 filter row is ticket 05's; leave `ChipRow`.
- Tests: `party-mine`, `party-mine-activation`, `party-mine-mock`, `party-find`, `party-find-mock`, `party-boards`, `party-form`, `party-form-parts`, `party-form-edit`, `events-party-form`, `party-invites` (`.integration`), `features/party-finding.unit`, `features/mine-step-place.unit`.

## Acceptance criteria

- [x] A recruiting 내 파티 card reads "3/8명" and another reads "N명". The request circle shows its count. Another's activation reads "활성화 중 · {name}", and after 거절 "활성화 중 · 참여 안 함". (Integration tests, which fail before the change.)
- [x] "전체 게시판 ›" and the Boards card both open the Boards. A recruit card has no body preview and no "자세히 ›". (Integration tests.)
- [x] The picker is titled "관련 행사 고르기" and choosing a 행사 still fills the form. (Integration test.)
- [x] "Before" and "after" emulator screens of 내 파티 (with an activation), 찾기, the form and the picker go in the pull request.
- [x] No native file changes; lint, format and types pass on the app.

## Comments

### Done (2026-11-26)

- **내 파티 card.** It is one line high: a drawn grey 공개/비공개 icon, the title with "3/8명" or "N명", and "when · where" with "장소 미정".
  - Sent invitations are off the card, and `useMineCards` no longer fetches them.
  - Another's activation is "활성화 중 · {name}" beside a red light (`live-dot.tsx`, still under reduce-motion), with a grey 거절 and an outlined 참여. After declining it reads "활성화 중 · 참여 안 함".
  - The light is placed in the text column, as chosen from a mock-up.
  - 내 정보 → 참여 중인 파티 shares the card.
- **찾기.** It has the round "전체 게시판 ›" and a Boards card whose N is the sum of `useBoardRows`. The card is hidden while searching.
  - The recruit card loses its badge, preview and "자세히 ›". Its title is now the screen reader's button to the post.
  - The Assistant's quest cards share `PostCard` and changed too.
- **Form.** Each field but 태그 has an icon. `LineIcon` draws those `Icon` lacks.
  - `TextField` gained an optional `labelIcon`, and `WhenField`/`WhereField` an optional `icon`.
- **관련 행사 picker.** It is titled "관련 행사 고르기", with rows shaped like the 행사 tab's and a light blue, checked row for the chosen 행사.
- Pull request #562, with the "after" screens in `references/after/04-*.jpg`.

Follow-up for ticket 07: the picker's date column is 72 wide with a 24 day, because "10월 · 오늘" ran into the rule at 60. If the 행사 tab settles on 60, the picker should follow.

### Agent usage (2026-11-26)

- Agent time: about 45 minutes in one session (an estimate). This includes:
  - about 10 minutes waiting for the shared heavy-job lock;
  - the emulator screens;
  - the review fixes.
- Tokens (the session and its two review subagents): output 120,227. Input 46,244,343 in all, made of:
  - 45,721,133 cache reads;
  - 522,764 cache writes;
  - 446 uncached.
