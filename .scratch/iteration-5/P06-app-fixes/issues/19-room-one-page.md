# 19: 파티 상세 as one page: the 모집글 inside, no badges, the event in the time-and-place box, an activation card with a red light and no 거절, 전체 위치 공유 asked first, 일정 without ✓, and leaner rows

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update and a main server Release (part 2's members of a running Party).

## What happens now

On 2026-11-26 the user sent notes on the 파티 tab. Items 3 and 4 of the wireframes cover the room (파티 상세). On 2026-11-27 they were settled over four rounds on one image: `references/19-1-room-wireframe.webp`.
- Its left column is the room now, with every branch, read from the code.
- Its middle column is the change.
- Its cards 1–11 pair each part's branches now with the change.

The user's words for the main choices:
- The badges: "배지는 전부 삭제".
- The text: with 모집글 보기 gone, the quote box is not needed either.
- The activation:
  - "활성화에 대한 카드를 따로 두고, 거기에 나도 참여하는 버튼을 그 카드 안에 두는게 좋을 것 같아".
  - "누가 지금 해당 파티 활성화에 참여중인지는 카드에 간단하게 이름만".
  - "거절 버튼은 굳이 두지마".
  - "초록색 박스가 마음에 안들거든? 차라리 내 파티 탭에서 '활성화 중' 옆에 빨간 점 깜박거리는 것처럼".
- 전체 위치 공유: "위치 공유가 꺼져 있는 상태에서 활성화를 하고싶으면 … 전체 위치 공유를 키라는 단계를 먼저 두는게 맞는 것 같아, 거기서 킨다고 수락하면 전체 위치공유가 켜지면서 활성화에 자동으로 들어가진다거나".
- The event: "박스에 시간이랑 장소 남기잖아, 그 아래 행사 파란글씨로 추가해두는거 … 그 줄 오른쪽에 누를 수 있다는 > 이런 아이콘 하나 추가한 다음, 누르면 행사 팝업이 뜨도록".
- 일정: "체크표시 빼버리고 싶어" and "다음 일정이 시작되면 해당 일정이 주황색으로 하이라이팅되고(지금처럼) 그 전 일정은 회색 처리되도록".
- Kept as they are, by the user's word:
  - the last step without an end time (it stays orange);
  - the member line 'n분 늦어요', which nothing in the app can set;
  - activation without a push for now.

Positions are as of `origin/5.0/Main` 5cb8d369, under `mobile/src/` unless the path starts with `main-server/`.

- **App bar.** `RecruitingActions` (`screens/room/room-screen.tsx`) shows `모집글 보기` for an Open or Approval Quest and `수정` for its Leader (not for a Quest taken alone).
- **Head.** `Head` (same file):
  - the badges (`badgesOf`, `features/quests/room-adapter.ts`): 파티 · n/cap명 or n명, 내가 만든 파티, 비공개, the event's title; a Quest taken alone shows 퀘스트;
  - the title;
  - a Closed Quest's text in a quote box (`text`, "" for the others, whose text is on the post);
  - the tags.
- **The 모집글 screen's host row** (`screens/party/post-content.tsx:82`) says "{name} · 모집자" with the department and when it was posted. Its time-and-place card follows.
- **Activation.** `ActivationBox` (`screens/room/activation-box.tsx`) has four states (`ActivationView`):
  - `none`: '아직 활성화하지 않았어요' with 파티 활성화;
  - `in`: green, with 활성화 끄기 / 활성화에서 나가기, plus `MasterOffLine` and the 내 위치 공유 `SwitchRow`;
  - `waiting`: 거절 / 참여;
  - `declined`: 참여.
  - The asks are `openAsk` (with `SWITCH_OFF_LINE` while the Master Switch is off), `joinAsk` and `leaveAsk`.
  - The toast after opening is "파티를 활성화했어요 · 멤버 n명에게 알림" (`screens/room/use-room-actions.ts:164`).
- **Event card.** `RoomEvent` (`screens/room/room-event.tsx`) is the design system's `EventCard`, whose default kind prints '공식 행사'. A press opens `EventDetailSheet` without its party button. An event the 행사 list no longer holds takes no press.
- **일정.** `PlanSection` (`screens/room/plan-section.tsx`):
  - a dot-and-rail timeline;
  - ✓ (완료로 표시 / 완료 취소, `toggleDone`);
  - ✎ ✕ for the Leader, except on the attending step.
  - `planOf` (room-adapter) sets `next` to the first step not done, ended or cancelled, and `over` to done, ended or cancelled.
- **People.** `screens/room/people-sections.tsx` and `person-row.tsx`:
  - 신청's line is the note, or else "n시간 전";
  - 멤버 has the aside 'n자리 남음' (`left`) and the lock line while the activation waits or was declined;
  - a press on a member the User does not see toasts "…님은 위치가 꺼져 있어요";
  - 초대 중's line is '응답 대기';
  - the Leader has a gold ring, a crown badge and a '파티장' pill;
  - every row has a bottom line.
- **Facts found while settling it:**
  - Party sight is mutual. Two members see each other only while both Party switches and both Master Switches are on (`main-server/src/location-sharing/visibility.service.ts`, `sharingMembersOf` and `linkedTo`).
  - Opening a Party sends no push. Other Holders see it in the 알림 list and in 내 파티 from `GET /parties` (`features/notifications/adapter.ts`, `partyNotices`). `openAsk` and the toast say otherwise.
  - A join request's note has no input anywhere. `noteOf` (`api/quest-parts/notes.ts`) is null in the server build.
  - `done` is each Holder's own mark. The server only stores it, and `toSubQuestDto` notes "the User's mark of done does not end it". The app reads it in `planOf` and in `upcoming` (`features/party/making.ts`), which picks 내 파티's time and place (`shownSubQuest`) and the step the 파티 form edits (`editedSubQuest`).
  - The plan form sends a start only. A step without an end never passes (`passed`, `main-server/src/quests/dto/quest.dto.ts`), so ✓ is today the only way past it.
  - `GET /parties` (`VisiblePartyDto`, `main-server/src/parties/dto/party.dto.ts`) gives a running Party's member count, the User's Friends among the members and the Leader, not the members' names. `GET /parties/mine` gives the members of the User's own Party.

## What to build

### 1. App bar and head

1. **No `모집글 보기`.** `수정` stays as now.
2. **No badges** at all, the Quest taken alone's 퀘스트 included.
3. **Under the title, the 모집글's content**, drawn as 파티 모집글 draws it:
   - the Leader's row: avatar, name, then the department · when it was posted, **without "· 모집자"** and without any other mark (no 방장, no 비공개);
   - the Quest's text, for every Quest. The quote box goes, and so does the Closed-only rule;
   - the tags, as now;
   - the time-and-place box (clock line, pin line), with **no map button**. Its time and place are those of the orange step (part 3). With no step, the 모집글's own words for none.
4. **The event line**, for a Quest with a Global Event, as the box's last line:
   - `calendar` and the event's title in blue, on one line, with `chevronRight` at its end;
   - a press opens `EventDetailSheet` over the room as the card does now, with no party button;
   - an event the 행사 list no longer holds shows the line without the chevron and takes no press;
   - the separate event card goes.
5. A Quest taken alone keeps its head this way, with no activation and no 멤버, as now.

### 2. Activation

1. **Not running:** a full-width primary `파티 활성화` (`pin` icon) with a **?** at its right: 20 round, outlined, `inkMuted`.
   - The ? opens a dark bubble under it with the activation help (below). A press elsewhere closes it.
2. **Running: one white card** in place of the green box (`cardStyles.card` look):
   - the top line: the blinking `LiveDot` of 내 파티 (`screens/party/live-dot.tsx`), '활성화 중' (15 Bold), and an 18 ? at the right opening the same help;
   - under it, the faces of those in (`Avatar` 26, overlapping by 6) and "{names} 참여 중" (13 Medium muted). Names are in the order they entered, with '나' for the User;
   - **not in:** `나도 참여` (primary, full width). **No 거절**, so a declined activation shows this same card;
   - **in:** the card takes 내 파티's live outline (2 `snuBlue` and a 4 `blue100` halo), with `활성화 끄기` (danger) for the member who leads the Party and `활성화에서 나가기` (danger) for the others. They ask as now;
   - **the 내 위치 공유 switch goes**, and so does the member line '공유 일시정지'.
3. **전체 위치 공유 first.** A User whose Master Switch is off, or whose Party switch is off (kept from an older version), is not in, since nobody sees them:
   - **The sheet.** With the Master Switch off, `파티 활성화` or `나도 참여` first opens one sheet:
     - title '전체 위치 공유를 켤까요?';
     - text '전체 위치 공유가 꺼져 있으면 활성화에 참여해도 서로의 위치가 보이지 않아요. 켜면 바로 활성화에 참여해요.';
     - buttons 취소 and `켜고 참여`, or `켜고 활성화` for 파티 활성화;
     - when the User is in another Party, the sheet adds the line `joinAsk` / `openAsk` add for it.
   - **Its confirm** turns the Master Switch on as 내 정보's switch does, with the location explanation first where the phone has not allowed location. It then opens or joins at once, with no second question.
   - **A User in the Party whose Master Switch or Party switch is off** sees the not-in card:
     - with the line (`alert` icon) '전체 위치 공유가 꺼져 있어서 참여하지 않은 상태예요';
     - with the button `위치 공유 켜고 참여`, which turns on whichever is off (`setSharing(true)` for the Party switch).
4. **Who is in.**
   - When the User is in: from `GET /parties/mine`'s members.
   - When not: `GET /parties` adds, only for a Party whose Quest the User holds, its members `{ id, name }` in the order they entered (`VisiblePartyDto` and `listVisible` in `main-server/src/parties/`; the app's `Party` type and its check).
   - A Friend who does not hold the Quest gets no names beyond `friends`, as now.
5. **Words.**
   - `openAsk`'s '멤버 n명에게 알림이 가요. ' becomes '다른 멤버의 알림 목록에 떠요. ', and its `SWITCH_OFF_LINE` goes, since the sheet above replaces it.
   - The toast after opening becomes '파티를 활성화했어요'.
   - No push is added.
6. **The activation help**, one line each:
   - 켜면 다른 멤버의 알림 목록에 떠요
   - 참여한 멤버끼리만 지도에서 서로의 위치를 봐요
   - 참여하려면 전체 위치 공유가 켜져 있어야 해요
   - 일정 시작 30분 전부터 그 장소에 도착하면, 위치를 보는 멤버에게 도착 알림이 가요
   - 한 번에 한 파티만 참여할 수 있어요
   - 다 모이면 꺼 주세요. 꺼도 파티는 그대로 남아요
   - 남은 일정이 있어야 켤 수 있어요

### 3. 일정

1. **Heading:** part 4's section title with `clock`, and an 18 ? after the words, opening a bubble with the 일정 help (below). `+ 추가` stays at the right for the Leader.
2. **Steps:**
   - a `clock` icon (18) in place of the dot and the rail, in `party` for the orange step and `inkFaint` for the others;
   - the time, the title and the place as now;
   - **✓ goes** (완료로 표시 and 완료 취소);
   - ✎ ✕ stay for the Leader, except on the attending step.
3. **One rule for grey and orange**, as a shared function in `features/quests/`. Steps are sorted as now, by start, those without one last.
   - **Grey:** the step is cancelled, its end has passed, or a later step in that order has started.
   - **Orange:** the first step that is not grey.
   - The last step without an end time stays orange.
   - `done` is no longer read anywhere in the app.
4. **The same rule replaces `done`** wherever the app reads it:
   - the room's walking destination (`destinationOf`, through `over`);
   - 내 파티's time and place (`shownSubQuest`, through `upcoming` in `features/party/making.ts`);
   - the step the 파티 form edits (`editedSubQuest`).
   - The server's toggle endpoint and its stored marks stay.
   - PR 662 (open, another owner) touches `features/party/mine.ts`. This ticket changes `making.ts`, not `mine.ts`.
5. **The 일정 help**, one line each:
   - 일정을 추가·수정·삭제하면 다른 멤버에게 알림이 가요
   - 지도에서 고르거나 건물 이름으로 적은 장소는 활성화 중 멤버의 도보 시간과 도착 알림에 쓰여요
   - 내 파티 목록의 시간과 장소도 일정에서 가져와요
   - 행사를 골라 만든 일정은 행사를 따라가서 고칠 수 없어요

### 4. 신청, 멤버, 초대 중

1. **Section titles**, one component for the four lists (e.g. `screens/room/section-title.tsx`):
   - an icon tile (28, radius 8, `blue50`) with a 16 `snuBlue` icon, then the words (18 SemiBold);
   - the icons: 일정 `clock`, 신청 `usersPlus`, 멤버 `users`, 초대 중 `send`.
2. **신청:** the line under the name goes, both the note and "n시간 전". '전에 내보낸 멤버' stays.
3. **멤버:**
   - 'n자리 남음' becomes the count as 찾기's card shows its fill: "3/4명" in `party` Bold 13 at the right, for an Open or Approval Quest. A Closed Quest shows none;
   - the lock line goes;
   - a press on a member the User does not see does nothing, with no toast. One the User sees still opens the map;
   - 'n분 늦어요' stays as it is.
4. **The Leader** has only the crown badge on the avatar. The gold ring and the '파티장' pill go, and a screen reader still says 파티장.
5. **초대 중:** '응답 대기' goes. The dimmed row and 초대 취소 stay.
6. **No line** under the last row of each list.

### 5. Kept as they are

- The footer (파티 없애기, 나가기, 퀘스트 없애기) and its questions.
- The member row's icons and their dialogs, 수락 / 거절 of requests, 초대 취소, the plan form, and the loading and error states.
- 파티 모집글 from 찾기 (sheet and screen), with its "· 모집자".
- 내 파티's card strip (활성화 중 · 거절 / 참여).

## Must not break

- Opening, joining, leaving and ending an activation, with the other-Party questions; the friend panel and the map's members; walking times; arrival notices.
- The requests' 수락 / 거절, 초대 취소, 친구 추가, 파티장 넘기기, 내보내기.
- 내 파티's time and place for Quests without the grey rule's cases, and the 파티 form's edit.
- The notices' 활성화 rows and the 파티 tab's badge.
- Tests:
  - `room-activation`, `room-done` (its ✓ checks change), `main-room` and `party-mine-activation` (`.integration`);
  - `person-rows`, `features/room-adapter`, `room-counting` (`.unit`);
  - the main server's party tests;
  - those `git grep` finds for `ActivationBox`, `PlanSection`, `PersonRow`, `RoomEvent`, `toRoom`, `planOf`, `upcoming`, `shownSubQuest`, `editedSubQuest`, `openAsk`, `listVisible` and `VisiblePartyDto`.

## Out of scope

- A push when an activation opens (the user left it for later).
- An entry for reporting late ('늦어요').
- The map entry from the place.
- 내 파티's 거절.
- An end for the last step.
- The server's done marks and their endpoint.

## Acceptance criteria

- [x] No 모집글 보기 and no badges. The Leader's row (no 모집자), the text for every Quest (no quote box), the tags and the time-and-place box stand under the title. (App integration test, which fails before the change.)
- [x] The event is a blue line with › in the box, and a press opens the event sheet. An event no longer listed has no › and no press. There is no separate event card. (App integration test, which fails before the change.)
- [x] Not running: 파티 활성화 with a ?, which opens the help with this ticket's words. (App integration test, which fails before the change.)
- [x] Running: a white card with the red light and the names of those in. Not in: 나도 참여 and no 거절. In: the outline and 활성화 끄기 / 활성화에서 나가기. There is no 내 위치 공유 switch. (App integration test, which fails before the change.)
- [x] With the Master Switch off, 파티 활성화 and 나도 참여 ask to turn it on, then open or join with no second question. A member whose Master Switch or Party switch is off sees the not-in card with 위치 공유 켜고 참여. (App integration test, which fails before the change.)
- [x] `GET /parties` names the members of a held Quest's Party, and others' Parties as before. (Main server test, which fails before the change.)
- [x] `openAsk` and the toast say what part 2 says. (App integration test, which fails before the change.)
- [ ] 일정 has clock icons, no ✓ and the ? help. Grey and orange follow the rule. 내 파티's time and place and the edited step follow it too. (App unit and integration tests, which fail before the change.)
  - Met except 내 파티's time and place, which never read `done` and are left as they are (see Decided while building).
- [x] 신청 rows have no line. 멤버 has the orange count, no lock line, no toast and the crown alone. 초대 중 has no 응답 대기. Last rows have no line. The titles have their icons. (App integration test, which fails before the change.)
- [ ] Checked on the user's phone with the pull request's release build.
- [x] No native file changes and no migration; lint, format and types pass on the changed files.

## Decided while building

- **내 파티's time and place are left as they are.** The 내 파티 card reads `shownSubQuest` of `features/quests/adapter.ts`, not the one in `features/party/making.ts`. That function never read `done`: it takes the attended step first, else the first step not cancelled or ended. So removing ✓ changes nothing there. Making it follow the grey rule would change that shared function, which the map's rows and pins, 찾기 and the 행사 tab also use, and which PR 662 also edits. `making.ts`'s `shownSubQuest` and `editedSubQuest` (the 파티 form) do follow the rule. The 일정 criterion stays unticked for this part.
- **The rule** is `standingsOf` and `stepsAhead` in `features/quests/plan-steps.ts`:
  - A cancelled later step never starts, so it greys nothing before it.
  - An end counts as passed by the server's `ended` or by the phone's clock, whichever comes first.
- **The not-in card** has the ticket's one line, '전체 위치 공유가 꺼져 있어서 참여하지 않은 상태예요', also when only the Party switch is off.
- **`members` in `GET /parties`** is left out, not empty, for a Party whose Quest the reader does not hold. Invitations and join requests share `toVisiblePartyDto`, so their `party` gets `members` too when the reader holds its Quest. The app accepts a list without it (an older main server): those in are then the Leader alone.
- **The Master Switch sheet's confirm** waits for the main server to take the switch before it opens or joins. If the switch is refused, its own toast shows and nothing opens. Without the location permission, the explanation and the prompt come first (`useSharingSwitch().change(true, then)`). The switch's `turn` now returns whether it was taken.
- **`openAsk`** keeps '수락한 멤버끼리만 서로 위치를 볼 수 있어요.' as the ticket writes it. The wireframe's sheet says '참여한 멤버끼리만'. `openAsk` no longer takes the Master Switch, and `openParty` no longer takes the count of others.
- **Removed as no longer used:** the room's `toggleDone`, plus `ActivationView`'s count of those sharing and its Leader's name. The API client's mark and unmark of done stay, unused, as does the server's endpoint.
- **The faces** use a new `xs` (26) size of the design system's `Avatar`.
- **The help bubbles** open over the screen in the app's `Overlay`, with the arrow under the ?. A press anywhere closes them.
- **The 모집글's Leader row and grey box** are now `PostHost` and `InfoBox` in `screens/party/post-content.tsx`, shared by the 모집글 (with "모집자") and the room (without).
- **수정 in the app bar** (fix after the user's phone check): the bare ghost `Button` stood at the top of the bar's row, as a button that is not `full` takes `alignSelf: 'flex-start'`. The old `RecruitingActions` had wrapped it in a centred View. `EditAction` now passes `centred`, which puts 수정 on the title's line; `AppBar` itself is unchanged.
- **One way into an activation** (fyoon46's review): the room, 알림's 파티 켜기 and 내 파티's strip 참여 all open and enter through `usePartyEntry` (`screens/room/use-party-entry.tsx`). It holds `openParty` / `joinParty`, the Master Switch sheet, the sharing switch and the location explanation. With the Master Switch off, all three ask '전체 위치 공유를 켤까요?' (켜고 활성화 / 켜고 참여, with the other-Party line), then go on with no second question. With it on, each behaves as before:
  - the room always asks `openAsk`, while 파티 켜기 asks only beside another Party;
  - 내 파티's strip still leaves the other Party rather than ending one the User leads, as its sheet says.
  - The questions moved from `activation-box.tsx` to `screens/room/party-asks.ts`.
- **The library's booked room** (PR 684, merged during the build) stays on the step `shownSubQuest` shows, as the lists show it. The head's box takes the orange step's place line as 일정 draws it, so it carries the room whenever the orange step is that step.
- **Tests:**
  - `answerRoom` now answers the Lobby with the Master Switch on, as the room's flows need. The Master-Switch-off flows are in `room-activation-master`.
  - `master-off-line` no longer covers the room, which has no 내 위치 공유 switch now.
  - The room adapter's 활성화 cases moved to `room-adapter-activation`, with its fixtures in `support/room-sources.ts`, to stay under the 300-line limit.
  - 멤버 of a Closed Quest is in `room-member-row`, for the same reason.
  - With the Master Switch on, the phone sends its position, so `room-people`'s list of requests leaves out `POST /positions`. A member the User does not see is now read as words, not as a button.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 1 h 20 min (an estimate). One session, in this worktree:
  - the build, 20:41 to 21:46 KST;
  - the 수정 fix after the phone check, about 10 min from 22:05;
  - the review's README fix and a merge of `5.0/Main`, about 5 min from 22:25.
  - About half of it was spent waiting on the room's integration tests, which take about 30 s per test on this machine. No subagents.
- Tokens:
  - Input: about 107.1M in all. That is 0.0006M uncached, 106.6M cache reads and 0.52M cache writes.
  - Output: about 0.21M.
