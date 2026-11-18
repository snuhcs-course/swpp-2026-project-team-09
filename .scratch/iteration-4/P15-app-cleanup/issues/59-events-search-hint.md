# 59: The events search field says what it searches

Parent: [P15 spec](../spec.md), item 59; a tester's report of 2026-11-18 using the released app: "행사 탭 상단에 행사 검색에 현재 '행사 검색' 회색 문구를, 뭘 어떻게 검색할 수 있는지 가이드를 주게 수정 → '제목 / 시간 / 장소' 모두 검색 가능하다는걸 나타내고 싶음."
Status: ready-for-human
Owner: fyoon46
Blocked by: none

Native files: none. Releases: an app OTA update only (no main-server Release, no native Release). No board: the canvas draws the field with its old grey words and only those words change, so the pull request shows emulator screens.

## What happens now

- The 행사 tab's search field (`mobile/src/screens/events/events-bar.tsx`) and the party form's event picker (`mobile/src/screens/party/form/event-field.tsx`) both say "행사 검색" in grey.
- Both filter through `toEventViews` (`mobile/src/features/events/adapter.ts`), whose `matches` looks for the words, ignoring case, in an event's title, its place and its description. The time is not read: "09:20" or "내일" finds an event only when its title or description holds those characters. The report's "시간" does not match as claimed.

## What changes

- Both fields say "제목·장소·내용 검색": what `matches` reads, with "내용" for the description that the detail sheet shows. The words live in one constant beside `matches`, `EVENT_SEARCH_HINT`, so the two fields cannot drift apart.
- No examples such as 중앙도서관: "제목, 장소, 내용으로 검색" already ran past the field on a 360 dp wide screen at font size 2.0, so the hint is the shorter board-search form and no line is added under the field.

## What stays as it is

- What the search matches. Making the time searchable is a change of its own (a follow-up), not of this hint.
- The screen-reader labels ("행사 검색어", "행사 검색").

## Acceptance criteria

- [x] The 행사 tab's search field and the event picker's field show "제목·장소·내용 검색" while empty.
- [x] Tests, by ADR 0007: `events-tab.integration.test.tsx` and `events-party-form.integration.test.tsx` read the placeholder.
- [x] On the emulator, the hint is whole at font size 1.0, 1.3 and 2.0, and at 2.0 on a 360 dp wide screen.

## Comments

### Notes from the implementation (2026-11-19)

- The emulator showed the cut first-hand: "제목, 장소, 내용으로 검색" was clipped after "내용으로" at 360 dp wide and font size 2.0, while "제목·장소·내용 검색" stays whole there.
- The time is not matched, so the hint does not name it. Matching the card's time ("18:00", "내일") would be a change to `matches`, left for a ticket of its own.

### Agent usage (2026-11-19)

- Agent time: about 30 minutes in one session, most of it the emulator pass (an estimate).
- Tokens, up to opening the pull request: input 12.9 M, of which 12.75 M cache reads and 0.15 M cache writes (170 uncached); output 35 k. No subagents.
