# 03: 찾기, 전체 파티, the boards and 파티 모집글

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (The mocked parts of a Quest)

## What to build

`찾기` and what opens from it follow the wireframe's `Party` and `PartyPost`. A User sees official recruiting in a banner, searches and reads posts ordered by their tags, hides the ones they do not want, finds people looking for company, and reads why a post is recommended.

Official recruiting, hiding a post and people looking for company have a mock adapter each, added here. `추천 이유`'s `시간대` comes from the User's timetable and `친구` from the Friends; `관심사` from the mocked tags.

## Acceptance criteria

### 찾기

- [ ] A banner carousel `공식 · {org}` with title, subtitle and photo, ‹ ›, play and pause, `n / N`, turning every 4 s; `+` opens `전체 파티` on `공식`; a press opens the join sheet.
- [ ] `파티 검색` matches title, text, place and tags.
- [ ] `모집 중인 파티` is ordered by how many tags a post shares with the User's.
- [ ] A card shows its photo, up to three faces, and `{name} 외 {n}명 · 친구 {k}명 포함`.
- [ ] A card has `관심 없음` and `참여하기`; `관심 없음` hides it and shows `숨긴 파티 {n}개 · 다음 추천에 반영할게요`.
- [ ] `같이 할 사람을 찾는 중`: name, department, what they want, tags, `겹치는 빈 시간 · …` and `같이 하자고 하기`.

### 전체 파티 and the boards

- [ ] `전체 파티` has the tabs `공식` and `일반`; `공식` lists official recruiting with its fill; `일반` lists the boards as today.
- [ ] On a board, the badge `내 파티` or `참여 중` stands before the title, and the User's own post opens the post.

### 파티 모집글

- [ ] A photo with its caption and the tags.
- [ ] The members line shows faces.
- [ ] `추천 이유` with `관심사` (`{tags}가 내 관심사와 겹쳐요` or `겹치는 관심사 없음`), `시간대` and `친구`.
- [ ] Another's post has `관심 없음` beside `참여하기`.

### Join sheet

- [ ] The note says that the members share their locations once the Party is switched on (any Holder switches it on; see the spec's Rules).

### Tests and PR

- [ ] Jest covers each state above against the mocks.
- [ ] Screenshots of each screen beside its frame, under Test Results.
