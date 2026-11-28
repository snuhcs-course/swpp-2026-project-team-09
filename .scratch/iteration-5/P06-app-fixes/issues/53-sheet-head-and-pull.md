# 53: Every sheet has a head closed by a rule, and a pull at the top of its content lowers it

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: 50 (PR 763), as this branch is built on it.

Native files: none. Releases: an app OTA update only.

## What happens now

The user on 2026-11-28, on the 행사 tab's event sheet: "우리가 AI 채팅에서 사용하던 바 밑에 가로줄을 두어서 끌어당길 수 있는 구역 표시가 안되어 있고, 스크롤로 카드가 안내려져. 이 부분은 공용 리팩토링해서 글로벌하게 적용될 수 있도록 해줘."

- **The sheets.** Every one of the 17 sheets is a `BottomSheet` (`mobile/src/design-system/bottom-sheet.tsx`, `sheet-pull.ts`). Each has a grip, and only the grip drags it. None has a rule under its head.
- **The body.** It takes no drag, by the rule of ticket 35 from the same morning. So a sheet's content, scrolled to its top, never lowers the sheet.
- **The answer card.** The Assistant's answer card on the map closes its head with a hairline (`card-header.tsx`), and a pull at the top of its content moves the card (`card-drag.ts`).

## What to build

The user amended ticket 35's rule on 2026-11-28, with a teammate's agreement: "스크롤은 우리의 의견을 밀고 가도록 하자."

1. **A head with a rule.**
   - `BottomSheet` takes a `head` and draws it under the grip, then a hairline rule in the border colour.
   - The grip and the head drag the sheet. A tap on the grip still closes it.
2. **The body's pull.**
   - A pull down on the body moves the sheet and lets go by the same rules as the grip (`closesOnLetGo`).
   - Content that scrolls in a sheet scrolls in `SheetScroll`. It shares the finger with the pull and hands over only once the content is scrolled to its top.
   - A body that does not scroll is pulled anywhere.
   - `pullBody={false}` turns the pull off for a body of wheels (날짜·시간, 시간 고르기) and for the map of the place on the map.
   - `sheet-pull.ts` states the amended rule.
3. **All 17 sheets move onto it.**
   - Titles move into `head`.
   - Scrolls become `SheetScroll`.
   - A source test fails on a file that draws a sheet and a plain `ScrollView` without `pullBody={false}`.
4. **Kept as they are:** the slide down on close (#705), the scrim, Android's back, and the answer card's own drag and snaps.

## Acceptance

- [ ] The head and its rule; a body pull closes the sheet at the content's top and not while it is scrolled; no body pull with `pullBody={false}` (unit tests, failing before).
- [ ] No sheet scrolls in a plain `ScrollView` without `pullBody={false}` (source test, failing before).
- [ ] The sheets' own tests still pass.
- [ ] On a phone: the event sheet's content scrolled to the top, pulled once more, lowers the sheet.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 29 minutes in the app-fixes session, measured from its transcript (an estimate). That session worked on several tickets at once, so its time and tokens are split by which ticket each step named. Pauses longer than five minutes are not counted.
- Tokens: output 48k; input 45.6M, of which 45.5M cache reads, 76k cache writes and 150 uncached. One Explore subagent (the survey of every sheet) is included.
