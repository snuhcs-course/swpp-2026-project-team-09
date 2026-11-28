# 34: 파티 만들기 as a preview of its 모집글: title and text typed in place, time, place and event in one box, the settings changed in place, a building search for the place, and no photo or tags

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None to start. The room's tag chips (part 6) wait for ticket 19 (PR 688), which rewrites the room's head where they are.

Native files: none. Releases: an app OTA update only.

## What happens now

On 2026-11-26 the user sent notes on the 파티 form (wireframe item 8). The form was settled with the user over four rounds on 2026-11-27, on `references/34-1-form-wireframe.webp`:
- its left column is the form now;
- its middle columns are the change, empty and filled;
- its cards 1–7 hold the parts.

The user's words for the main choices:
- The form is too long: "입력을 받을 때(혹은 수정) 아래에서 위로 팝업창을 올려주는 식으로 … 파티 만들기 탭은 결과물을 보여주는 식(… 파티를 올렸을 때 모집글이 어떻게 보일지를 미리 보여주는 식으로 …)".
- Title and text: "따로 팝업 안뜨고 키보드만 뜨고 입력하면 바로 해당 자리에 문구가 입력되는게 보였으면 좋겠네, 따로 확인 버튼은 안두고 그냥 다른 공간 터치해서 키보드 내리면 글이 그대로 자리에 남도록".
- The settings: "인원/공개 범위/태그 정도는 팝업이 올라오는거까진 아니어도 in place로 처리할 수 있는 UI … 친구 초대는 팝업이 올라와도 괜찮을 것 같은데". Tags then went (below).
- The place: "검색하면 해당 문자열로 검색창 밑에 매칭되는 건물들 띄워주는 식으로 하고 거기서 고르게 하고 싶어. 그리고 사용자 입장에서 이 장소가 실제 서버의 데이터베이스에 있는 건물 목록의 건물에 매칭이 된건지 … 임의의 문자열로 값이 저장돼서 들어가는건지를 UI로 보여줘야돼."
- The box's labels go ("언제, 어디서, 관련 행사 이 문구들은 삭제"), and so does the poster row's '방금'.
- Tags: "태그가 어차피 지금 서버로 안간다고 했잖아 … 일단은 빼고, PR 본문에만 태그를 뺀 이유를 적고 살리려면 그런 작업들이 필요하다는걸 남겨주면 좋을 것 같네."
- The earlier 08 wireframe's choices that stay:
  - no photo;
  - required marks;
  - 파티 올리기 always pressable, with the empty required fields marked;
  - picking an event leaves the title empty;
  - the boards shown at once.

Positions are as of `origin/5.0/Main` da4f5da0, under `mobile/src/`.

- **The form.** `PartyFormScreen` (`screens/party/form/party-form-screen.tsx`) lays out, in order:
  - 사진 (`photo-field.tsx`);
  - 관련 행사 (`EventField`, `event-field.tsx`);
  - 제목 (`TextField`, 30);
  - 본문 (`DescriptionField`, 200);
  - 언제 (`WhenField`, `screens/room/plan-form.tsx`);
  - 인원 (`CapacityField`);
  - 어디서 (`WhereField`: typed words and a map button);
  - 공개 범위 (`VisibilityField`: two big buttons, and under 공개 the 바로 참여 / 승인 후 참여 chips);
  - 게시판 (`BoardField`: a dropdown that opens `board-sheet.tsx`), only under 공개;
  - 친구 초대 (`FriendPicker`, inline);
  - 태그 (`tag-field.tsx`).
- **The footer.** One button: `파티 올리기` (공개), `파티 만들기` (비공개) or `수정 완료` (edit). It is disabled until `isReady` (`features/party/making.ts`) holds:
  - 공개: a title, a text and a board;
  - 비공개: a title and a Friend (in an edit, a title alone).
- **Edit.** `EditedForm` reuses the form for a Quest:
  - the title is '모집글 수정' or '파티 수정';
  - the event is locked (`eventLocked`);
  - 인원 has a floor of the Holders and the invited Friends (`leastCapacity`);
  - 친구 초대 offers the free places (`invitable`);
  - 언제 / 어디서 change `editedSubQuest`.
- **Picking an event** (`useEventPick`, `use-form-state.ts`) fills the title when it is empty, and the time and the place.
- **The place.**
  - `usePlaceToSend` (`features/places/typed-place.ts`) sends a Place picked from the list as itself. It sends a map point with its words. Typed words go as the Place they name when they name exactly one (`placeNamed`), and as words alone otherwise.
  - Only a Place or a point gives walking times, arrival notices and the map.
  - The building search exists: `placeSearchQuery` (`api/queries.ts:147`), used by `screens/places/place-picker.tsx`.
- **Photos and tags are never sent to the server.** `makingOf` leaves them out.
  - `use-send.ts:107` keeps them on the maker's phone only (`storage/quest-entries.ts`).
  - Every other phone, the server build included, gets stand-ins picked by the Quest's id (`api/quest-parts/tags.ts`, `photos.ts`).
- **What runs on the tags today, all on stand-ins for other people's 파티:**
  - the room's tag chips (`room-adapter.ts`'s `tags`);
  - the tag part of 찾기's search (`matchesSearch`, `features/party/finding.ts`);
  - 찾기's order by tags shared with the User's hashtags (`findPosts`);
  - 모집글's 추천 이유 '관심사' line (`reasonsFor` / `sharedTags`, `screens/party/post-reasons.tsx`).
- **The stand-in photos** show only on the Assistant's chat `PostCard` thumb (`screens/party/post-card.tsx`).
- **A real path from interests to 파티 exists on the server.** The topics step reads each recruiting Quest's title and text into `quest.topics`. `GET /interests/matches` then matches them to the User's hashtags and watched interests, for the map's interest marks and the '모집이 떴어요' notice. Nothing here changes it.

## What to build

### 1. The page: a preview of the 모집글

From the top:

1. **The app bar**, as now: `파티 만들기`, '모집글 수정' or '파티 수정'.
2. **The title, typed in place.**
   - A borderless input in the room's title style (22 Bold, line height 30), the placeholder '제목을 입력하세요' in grey with a red `*`, and up to 30.
   - A light `pencil` (16) at its right.
3. **The poster row:** the User's avatar, name and department. No time words such as '방금', and no role words.
4. **The text, typed in place.**
   - A borderless multiline input at 15 / 22, the placeholder '어떤 파티인지 소개해 주세요', and up to 200.
   - The red `*` shows under 공개 only, since a 비공개 파티 needs no text.
   - The `pencil` at its right.
5. **Typing in place.**
   - A press puts the caret there and raises the keyboard, and the words appear in place as they are typed.
   - There is no confirm button. A press anywhere else drops the keyboard, and the words stay.
   - The footer gives way while the keyboard is up, as `FullScreenPanel`'s `footerHidesForKeyboard` does.
6. **The box:** a grey box (`surfaceSubtle`, radius 12) of three rows, each an icon and the value, with no label words. Each opens its sheet, below.
   - `clock`: the time words, or '날짜·시간 선택' in grey. It opens the existing date and time sheet.
   - `pin`: the place words with their badge (part 2), or '장소 검색' in grey. It opens the place sheet.
   - `calendar`: the event's title in blue, or '관련 행사 고르기' in grey. It opens the 관련 행사 picker (ticket 16).
7. **'파티 설정'** (13 Bold, `inkMuted`), then the rows of part 3.
8. **The footer button**, worded as now and always pressable (part 4).

The 사진 field goes.

### 2. The place sheet: a building search

1. **The sheet.** It opens with a search field (`search` icon, the place words so far).
2. **The results.**
   - As the User types, the matching buildings show under the field: `placeSearchQuery`, the building number in a small navy tag, and the name with the typed words in bold.
   - A press picks one, closes the sheet and fills the row.
3. **The last row:** "‘{words}’ 그대로 쓰기", with the sub line '건물 목록에 없는 장소'. A press keeps the words as they are.
4. **`지도에서 고르기`** (secondary, `map` icon) opens the map picker as `WhereField`'s map button does now.
5. **The badge on the box's place row.** Exactly one of:
   - **건물** (`check`, navy on `blue50`): a Place from the list, or typed words that name exactly one Place (`placeNamed`), since those are sent as the Place;
   - **지도** (`map`): a point picked on the map;
   - **직접 입력** (grey): words alone. A grey line under the row reads '지도·도보 시간·도착 알림에 쓰이지 않아요'.
6. **What is sent is unchanged** (`usePlaceToSend`).

### 3. '파티 설정', changed in place (친구 초대 alone opens a sheet)

Rows of 52, each with an 18 icon, the label (15 Medium) and a line under it.

1. **인원.**
   - At the row's right, a small stepper: 32-round outlined − and + around the value ('4명', 15 Bold).
   - At the floor, − dims, and one grey line under the row says why:
     - '공개 파티는 2명부터예요' under 공개 at 2;
     - '나와 초대한 친구를 포함해요' when invited Friends set the floor;
     - '지금 멤버 수보다 줄일 수 없어요' in an edit.
   - The rules stay (`leastCapacity`, the maximum).
2. **공개 범위.**
   - At the row's right, a compact two-part toggle: 공개 (`users`) / 비공개 (`lock`).
   - Grey track and a white raised part, like the app's other segmented controls but small (30 high).
3. **참여 방식**, under 공개 only.
   - An indented row (label 14 `inkMuted`) with the same small toggle: 바로 참여 / 승인 후 참여.
   - 비공개 has no join policy to pick, as now.
4. **게시판**, under 공개 only, required.
   - Its row, then the four boards as pills under the label (식사 / 진로 / 취미 / 공연), in 찾기's filter pill look.
   - `board-sheet.tsx` goes.
5. **친구 초대.**
   - The row shows the chosen names, or '고르기' in grey, and a ›. It is required (`*`) under 비공개.
   - A press opens a sheet with `FriendPicker`'s search and list, the line '남은 자리 {n}명까지 초대할 수 있어요', and a primary 'n명 초대' (or '완료' with none chosen).
6. Choosing 비공개 removes the 참여 방식 and 게시판 rows. Choosing 공개 brings them back, with the earlier choices kept.

### 4. Required fields

1. **The button.** `파티 올리기` / `파티 만들기` / `수정 완료` is always pressable. With a required field empty, a press sends nothing and:
   - marks each empty field with a red outline and a red line under it:
     - '제목을 입력해 주세요';
     - '본문을 입력해 주세요' (공개);
     - '게시판을 골라 주세요' (공개);
     - '초대할 친구를 골라 주세요' (비공개, not in an edit);
   - scrolls to the first.
2. A mark clears as soon as its field is filled.
3. The rules of `isReady` stay. Only how they are shown changes.

### 5. Events and edits

1. **Picking an event** fills the time and the place, as now, but **no longer fills the title.**
2. **Taking the event out:** with an event chosen, its row opens the picker. The chosen event's sheet offers `행사 빼기` in place of the disabled '선택됨' (ticket 16). It clears the event, the time and the place, as `✕` does now.
3. **In an edit** the event row is locked: a `lock` icon and no ›, as `eventLocked` holds now. Everything else in an edit is as now (`editedSubQuest`, `invitable`, the title and the button words).

### 6. Photo and tags go

1. **The fields go.** Remove the 사진 and 태그 fields, `photo` and `tags` from `PartyForm`, and their keeping on the phone (`keepQuestEntries` and the entries in `use-send.ts`).
2. **What ran on the tags goes with them:**
   - the stand-in tags and photos in `api/quest-parts/` (`tagsOf`, `photoOf`), so no screen shows a 파티 tag or photo any more;
   - the room's tag chips (after PR 688; see Blocked by);
   - the tag part of 찾기's search: title, text and place search stay;
   - 찾기's order by shared tags, which becomes the order given, newest first as now within it;
   - 추천 이유's '관심사' line;
   - the chat `PostCard`'s photo thumb.
3. **The user's own hashtags** (내 관심사, `profile.hashtags`) and the server's interest matching stay untouched.
4. **The pull request body** must say, in a section of its own:
   - why the tags and photos went: never sent to the server, stand-ins on every other phone, so search, order and 추천 이유 ran on fake data;
   - what bringing them back needs: storing them on the server (a migration, plus the make and edit APIs) and showing the server's values; or using the server's AI topics (`quest.topics`, `GET /interests/matches`, which would also need the matched topic sent) for 추천 이유 and 찾기's order.

## Must not break

- Making a 공개 and a 비공개 파티, a 파티 for an event, a 파티 from a Friend's card (opens as 비공개 with that Friend), and one from the chat's Proposal (`ProposalForm`), with the same Quest sent as now.
- Editing:
  - the locked event;
  - the 인원 floor;
  - inviting into the free places;
  - the time and the place of the edited step;
  - '모집글 수정' / '파티 수정'.
- The place as sent:
  - a Place from the list;
  - a map point;
  - words naming a Place;
  - words alone.
- 찾기's search by title, text and place, its boards and filters, and 모집글's other 추천 이유 lines (시간대, 친구).
- Tests:
  - `party-form`, `party-form-parts`, `party-form-edit`, `events-party-form` and `party-find` (`.integration`);
  - the 추천 이유 and room tests that check tags or photos;
  - those `git grep` finds for `PhotoField`, `TagField`, `BoardSheet`, `VisibilityField`, `CapacityField`, `EventField`, `FriendPicker`, `isReady`, `keepQuestEntries`, `tagsOf`, `photoOf`, `sharedTags` and `reasonsFor`.

## Out of scope

- Bringing tags or photos back: server storage, or the AI topics. The pull request only records what that needs.
- The room (ticket 19), apart from its tag chips.
- 찾기's card and the 모집글's look (ticket 12), apart from 추천 이유's '관심사' line.
- Tickets 28 and 31 touch `screens/party/form/use-send.ts` and `features/party/making.ts`. Whichever lands second merges `5.0/Main` first.

## Acceptance criteria

- [x] The form opens as the preview: title and text typed in place with no confirm button, the poster row without time words, the box of three rows without labels, '파티 설정', and no 사진 or 태그. (App integration test, which fails before the change.)
- [x] The place sheet lists the matching buildings as the User types. The box shows 건물, 지도 or 직접 입력, with the line under 직접 입력, and what is sent is as before. (App integration test, which fails before the change.)
- [x] 인원, 공개 범위, 참여 방식 and 게시판 change in place. 비공개 hides 참여 방식 and 게시판. 친구 초대 opens its sheet. (App integration test, which fails before the change.)
- [x] With required fields empty, the button marks each in red with its line and sends nothing. (App integration test, which fails before the change.)
- [x] Picking an event leaves the title empty. The chosen event's sheet offers 행사 빼기. An edit's event row is locked. (App integration test, which fails before the change.)
- [x] No screen shows a 파티 tag or photo. 찾기's search still finds by title, text and place. 추천 이유 has no 관심사 line. (App integration test, which fails before the change.)
- [x] The pull request body says why tags and photos went and what bringing them back needs.
- [ ] Checked on the user's phone with the pull request's release build.
- [x] No native file changes; lint, format and types pass on the changed files.

## Decided while building

- A building picked in the search reads as the map view names it, '제2공학관 302동', not the wireframe's '302동 제2공학관', so that a building has one name whichever way it was picked.
- The badge follows what is sent (`placeKindOf(placeToSend(…))`): a map pick that lands on a listed building is sent as that Place, so it says 건물, not 지도.
- 친구 초대's sheet keeps its checks until 'n명 초대' (or '완료'). Closed another way, it keeps the Friends chosen before. Its rows are `FriendPicker`'s checked rows, the navy round check, not the wireframe's bare ✓. `FriendPicker` itself stays for the library's '친구 한 명 더 부르기' (`room-ask-more.tsx`); the sheet reuses its exported `FriendRow` and `matchesFriend`.
- 인원's line at the floor: the invited Friends first, then an edit's members, then 공개's two. 비공개 at 1 has none.
- The place sheet offers '그대로 쓰기' only once words are typed. With an empty search there is only 지도에서 고르기, so a set place can be replaced but not cleared.
- The title (30) and the text (200) keep their limits but show no counter, as the wireframe has none.
- The grey placeholder with its red `*` is drawn under the empty field, since a field's own placeholder takes one colour. The field keeps an unseen placeholder of the same words for a screen reader.
- A mark shows on a field the last press marked, while it is empty: emptying it again brings the mark back. The button shows the busy dots while sending, in place of being disabled.
- The room's tag chips first went in the smallest diff, because PR 688 had not merged. PR 688 then landed, and the merge of `5.0/Main` (2026-11-28) keeps its new head (the 모집글 under the title, the time and place box) and drops only its tags: `room-adapter.ts`'s `tags`, the chips in `room-screen.tsx`'s `Head`, and the tag checks in `room-wireframe` and `features/room-adapter.unit` (and `tags` in `support/room-sources.ts`).
- `useBoardRows` and `boardPosts`, which only the board sheet used, and `listMyTags` / `myTagsQuery`, which only the tag field and 찾기's order used, went with them. The phone's old `snunow.quest-entries` key and any `documents/quest-photos` files stay where they are, read by nothing.
- `party-form-fields.tsx` went over the 300-line lint limit, so the toggle and the stepper's buttons are in `small-controls.tsx`.

## 리뷰 후 변경 (2026-11-28)

The user checked the pull request on 2026-11-28 and approved these changes. The place sheet follows `~/Downloads/snu-now-party-event-wireframes/08-1-place-typed-options.jpg`.

1. **The edit's 수정 완료** is grey and takes no press until something differs from what the form opened with: the fields, a Friend chosen or the place. Undoing the change greys it again. Back still leaves the changes unsent.
2. **The place row's tag** is centred on the row (the old `Badge` stood at the row's top).
3. **Hangul in search fields.** `design-system/search-field.tsx` no longer sets `autoCorrect={false}`. On Android that set `TYPE_TEXT_FLAG_NO_SUGGESTIONS`, under which Samsung Keyboard typed '공학' as 'ㄱㅗㅇㅎㅏㄱ'. It was the only such setting in the app, so every `SearchField` is fixed at once: events-bar, friends-screen, friend-panel, find-bar, event-field, friend-picker, place-picker and the place sheet. No other input setting in the app has the same effect: `secureTextEntry` and `keyboardType="visible-password"` are unused, and `autoComplete="off"` only turns autofill off.
4. **The keyboard** goes down once a place is set.
5. **The place sheet:**
   - The title '장소' with a ?. It opens the room's dark bubble (`HelpButton`, now in `screens/help-bubble.tsx`, with lines that start with a tag and a note under a rule) titled '장소 종류':
     - the three tags, each with its line;
     - under the rule, '이름만은 지도·도보 시간·도착 알림에 쓰이지 않아요'.
   - One search field. After the buildings found come '지도에서 직접 고르기' and "‘…’ 이름만 쓰기", rows of the same rank. There is no big map button.
   - A press only chooses a row: ✓ and a light blue ground, no outline. '선택 · name · [kind]' shows right above the button. **이 장소로 정하기** sets the place and drops the keyboard; with nothing chosen it is grey.
   - A point inside a building on the map is that building (`toPlaceAt` 'inside' → `placeId`): 학교 건물. One near a building is '○○ 근처': 지도 위치.
   - **The kind tags** are one grey style everywhere: 학교 건물 / 지도 위치 / 이름만. They replace 건물 / 지도 / 직접 입력 on the box's row too (`place-kind.tsx`).
   - The line under 이름만 went from the box's row ('지도·도보 시간·도착 알림에 쓰이지 않아요').
   - The small words under "‘…’ 이름만 쓰기" read '지도에 없거나 더 구체적인 곳(카페, 301동 203호 등)'.
6. **Decided while making these changes:**
   - The sheet opens on the place's words with nothing chosen.
   - Back from the map view without a place leaves the sheet closed.
   - The bubble's tags are light on its navy. The sheet's and the row's tags are grey on white.
   - The room's help texts moved to `screens/room/room-help.ts`, unchanged.
7. **Tests.** These failed before the changes and pass after them:
   - `party-form-place-sheet.integration` (new, 6 tests);
   - `party-form-preview`'s 수정 완료 test;
   - `design-system/search-field.unit`'s Hangul test.

   Also passing: `party-form`, `party-form-preview`, `party-form-edit`, `events-party-form`, `room-activation` and `room-done`.

## 휴대폰 확인 후 수정 (2026-11-28)

The user's phone check of a40e3b30 found one bug. A sweep of the place and edit paths, by reading the code and running tests only, found two more. Each has a test in the new `party-form-place-saving.integration` that failed on a40e3b30 and passes now.

1. **A place added in an edit was not saved** (the reported bug). On a 파티 whose step had no time, `planChangeOf` returned nothing, so a place added alone was dropped. A step with a time but no place already saved it.
   - `planChangeOf` now sends a change of the place or the time even when the step has no time, keeping `startsAt: null`. The server's step edit accepts it (`subQuestContentSchema` defaults `startsAt` to null).
   - `SubQuestContent.startsAt` is now `string | null`, as the server's is. The one reader that needed it, `movedRows` in `screens/main/party-change.ts`, compares a null time.
2. **Undoing a place change left 수정 완료 on.** The place counted as changed by object identity. Picking the same Place again, whose words read '학생회관 63동' where the server's label is '학생회관 (63동)', still counted. The edit now compares what would be sent (`sameSentPlace` in `features/places/typed-place.ts`), so the same Place greys 수정 완료 again and sends no step change.
3. **A new 파티 for an event lost a place the User set at the event's own time.** `meetingOf` made a `모이기` only when the time moved. The form now passes `elsewhere` when the place differs from the event's (`meetingOf(form, elsewhere)`), and the 파티 meets there with `모이기`. The chat's Proposal card passes nothing and works as before. An edit already did this.

The sweep found nothing else. These cases pass before and after:
- a place added to a step with a time;
- replacing a set place (building → words, words → a building by its exact name or from the list);
- the sheet closed without 이 장소로 정하기, which leaves the place, and opened again on its words with nothing chosen;
- an edit changing only the time, only 인원 or only the Friends, each turning 수정 완료 on and saved alone;
- 공개 → 비공개 → 공개, which greys 수정 완료 again;
- an edit with a locked event changing only the place, which meets with `모이기`.

The new 파티's place none → building / point / words, words → building by typing a building's name, and point → building by a map pick inside a building are in `party-form-place-sheet.integration`. The time set and changed are in `party-form`, `party-form-edit` and `events-party-form`.

## 코드 리뷰 반영 (2026-11-28)

fyoon46's and Jaehyun0320's reviews of f1fe2091:

1. **Type check.** CI's `pnpm typecheck` failed on `party-form-place-saving`'s place-replacing cases, which spread tuples of two lengths (TS2556). The local type check had run before they were added. The cases now type their places as `[words, row?]`, and `pnpm typecheck` on `mobile/` passes, `__tests__` included.
2. **The event's own building made a second step.** A new 파티 for an event counted a Place picked from the search (`{placeId}`) as a place of the User's own, because `eventWhere` gives the event's point. `meetingOf` then added a `모이기` at the event's time beside the event's step. A Proposal with a Place, opened with 수정 and sent, did the same.
   - At sending, the form now asks the main server which building holds the event's point (`findPlaceAt`). A Place that is that building, 'inside', is not the User's own, so it adds no step.
   - Unknown, the Place counts as the User's own.
   - A different place still meets there.
3. **One building search.** The 300 ms settled search of `placeSearchQuery` is `usePlaceSearch` (`features/places/use-place-search.ts`). The place sheet and the timetable's place picker both use it.
4. **수정 완료** compares the title and the text trimmed, as they are sent, so an edit that only adds spaces leaves it grey. The orphan comment "The mocked parts of 찾기" in `queries.ts` went.
5. **The toggles' halves** are equal (`SmallToggle`'s parts `flex: 1`, every toggle 192 wide), the user's decision of 2026-11-28. The 게시판 pills stay in 찾기's filter look, by the user's own choice from the wireframe review.
6. **Tests.** These failed before the change and pass after:
   - `party-form-place-saving`: the event's own building;
   - `answer-frame-proposal-edit`: a Place that holds the event;
   - `party-form-preview`: spaces alone.

   Then passing: `party-form-place-saving`, `answer-frame-proposal-edit`, `party-form-preview`, `events-party-form`, `party-form-place-sheet`, `timetable`, `timetable-server` and `timetable-class-slots`. Its one failure, 'removing a slot', fails the same way on `5.0/Main`.

## Comments

### Agent usage (2026-11-28)

Estimates. Agent time is this session's working time from 2026-11-27 23:05 to 2026-11-28 05:30 (Korea time), with every pause of more than 15 minutes left out as waiting for another session or the user: about 5 hours 50 minutes. It covers:
- the build and the pull request (about 2 hours, of which some 70 minutes were Jest runs slowed by a load average above 20);
- the nightly-level CI run and its triage;
- four merges of `5.0/Main`;
- the changes after the user's review;
- the bugs found after the phone check;
- the code reviews' changes.

No subagents. Tokens are counted up to this entry, so this commit is left out.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 34 (tests first, the preview, the place sheet, '파티 설정', the marks, the photo and tag removal, the pull request, CI triage, four merges of `5.0/Main`, the changes after review, the bugs after the phone check, the code reviews) | about 5 hours 50 minutes | 232,089,581 | 231,334,348 | 754,279 | 954 | 362,537 |

Without cache reads, the input is 755,233.
