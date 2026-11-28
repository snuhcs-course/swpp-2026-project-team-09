# 41: The room's 일정 form sets its place with the 파티 form's place sheet and shows the same kind tag

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None. Ticket 34 (PR 712, merged on 2026-11-28) added the place sheet, the kind tag and the shared help bubble.

Native files: none. Releases: an app OTA update only.

## What happens now

From fyoon46's review of PR #712 on 2026-11-28: "the room's step editor still sets a place with the old `WhereField` (`plan-form.tsx:155`), so the same act has two screens, and only one shows the kind tag". The review called it fine as a follow-up ticket. The user asked for this ticket the same day.

Positions are as of `origin/5.0/Main` ec8337d6, under `mobile/src/`.

- **The form.** The room's 일정 section (`screens/room/plan-section.tsx`) opens `PlanForm` (`screens/room/plan-form.tsx`) inline, on a grey box, for 일정 추가 and for 일정 수정. It has three fields:
  - `내용`;
  - `언제` (`WhenField`, which opens `DateTimeSheet`);
  - `어디서` (`WhereField`).
- **어디서 now.** `WhereField` is a `TextField` with the placeholder '직접 입력' and a square map button beside it. The map button opens `/place-map` and fills the words with the place picked there.
  - Typed words go as the Place they name exactly, or else as words alone (`usePlaceToSend`).
  - Nothing on the form says which of the three a place will be.
- **The 파티 form after ticket 34.** 어디서 is a row in the grey box: a pin, the place's words or '장소 검색' in grey, the grey kind tag (`KindTag`: 학교 건물 / 지도 위치 / 이름만), and a chevron. A press drops the keyboard and opens `PlaceSheet` (`screens/party/form/place-sheet.tsx`, driven by `usePlaceSheet` in `use-place-sheet.ts`):
  - one building search;
  - '지도에서 직접 고르기' and "'…' 이름만 쓰기" as rows of the same rank;
  - a row press only chooses it, with '선택 · name · [kind]' above the button;
  - **이 장소로 정하기** sets the place and drops the keyboard;
  - a ? beside '장소' opens the '장소 종류' help bubble (`screens/help-bubble.tsx`).
- The building search is the shared `usePlaceSearch` (`features/places/use-place-search.ts`). `KindTag`, `PLACE_KIND_WORDS` and `usePlaceKind` are in `screens/party/form/place-kind.tsx`.
- `WhereField` is used only by `PlanForm`.

## What to build

1. **어디서 in the room's 일정 form is a row that opens the place sheet**, as on the 파티 form:
   - the pin, the place's words or '장소 검색' in grey;
   - the grey kind tag, centred on the row;
   - a chevron.
   - A press drops the keyboard and opens the same `PlaceSheet`, with the same search, rows, 선택 line, button and ? help.
   - The row's look fits the form's white fields on the grey box. Its height and border match `WhenField`'s button beside it, so 언제 and 어디서 read as a pair.
2. **What the sheet sets is what the form sends.** A place set in the sheet fills the form's words and picked place, and `usePlaceToSend` sends it as now:
   - a building as its `placeId`;
   - a map point as a point with its words;
   - words alone as words.
   - A map pick inside a building is that building, as on the 파티 form.
3. **An edited 일정 opens with its own place.** The row shows the place's words and its kind tag. The sheet opens on those words with nothing chosen, as the 파티 form's does.
4. **The place stays optional.** An empty 어디서 sends no place, as now. A set place can be replaced but not removed, as on the 파티 form (ticket 34's "No place clearing").
5. **`WhereField` goes**, with its styles and the '직접 입력' text field and map button, once nothing uses it.
   - The sheet keeps using `usePlaceSearch` and `usePlaceSheet`; nothing is copied.
   - `PlaceSheet`, `usePlaceSheet`, `KindTag` and `usePlaceKind` may move to a place both screens import from, such as `screens/place-sheet/` or `features/places/`, instead of the room importing from `screens/party/form/`.
6. **Kept as they are:**
   - `내용`, `언제` and their rules;
   - 취소 and 추가 / 수정;
   - 추가 / 수정 waiting for the content and the time;
   - what `actions.addSubQuest` and `actions.editSubQuest` receive;
   - the notice to the other members when a 일정 changes.

## Must not break

- The room's 일정: adding, editing and deleting a step, with and without a place, by its Leader and by a member who may edit.
- The 파티 form's place sheet (ticket 34), which this ticket reuses.
- A sheet over the room: the place sheet opens over the room's scroll view, and the keyboard lifts it as on the form.
- The map view (`/place-map`) returning its place to whichever form opened it.
- Tests:
  - `room-plan` (it types into '직접 입력' and presses '지도에서 선택' today);
  - the room's step tests that add or edit a place (`git grep -ln "직접 입력\|지도에서 선택" mobile/__tests__` among the room's files);
  - `party-form-place-sheet` and `party-form-place-saving`.

## Out of scope

- The timetable's class place picker (`place-picker.tsx`) and onboarding, which have their own place fields.
- How the 파티 form's sheet looks or works.
- Making 수정 wait for a change, as ticket 34 did for 수정 완료.

## Acceptance criteria

- [x] In the room's 일정 form, 어디서 is a row with the place's words and its grey kind tag, and a press opens the place sheet. (App integration test, which fails before the change.)
- [x] A building, a map point and words alone, each set with 이 장소로 정하기, reach `addSubQuest` / `editSubQuest` as a `placeId`, a point and words. A map pick inside a building goes as that building. (App integration test, which fails before the change.)
- [x] An edited 일정 shows its place's kind tag, and its sheet opens on its words with nothing chosen. (App integration test.)
- [x] `WhereField` is gone, and nothing imports it.
- [x] Checked on the user's phone with the pull request's release build.
- [x] No native file changes; lint, format and types pass on the changed files.

## Comments

### Agent usage (2026-11-28)

Estimates. Agent time is this session's working time from 14:45 to about 15:10 (Korea time) on 2026-11-28, about 25 minutes. About 7 minutes of it were Jest runs. It covers the tests written first, the room's place row, the move of the place sheet to `screens/place-sheet/`, the updated room tests, the checks and the draft pull request. The ticket itself was written in the orchestrating session, and its time is not counted here.

No subagents. Tokens are counted up to this entry, so this commit and the pull request are left out.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 41 (tests first, the place row, the moved place sheet, the room tests, the draft pull request) | about 25 minutes | 11,250,909 | 11,077,435 | 173,340 | 134 | 51,267 |

Without cache reads, the input is 173,474.

### Phone check (2026-11-28)

The user checked the release build of 87784e03 on their phone on 2026-11-28 and approved it.
