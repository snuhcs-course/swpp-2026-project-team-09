# 01: Room above the filter chips, and 찾기's card opens its post

Parent: [P20 plan](../plan.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

These are two small fixes in the tabs, found while using the app on an Android phone. Plan items 2 and 4 say where to look.

1. **The filter chips sit right against what is above them.** On Android, three rows of filter chips touch the element right above them, with no space between:
   - the friend panel's 전체 / 공강 / 위치 꺼짐 … under its search box,
   - the 행사 tab's 오늘 / 이번 주 / 파티 모집 중 …,
   - 파티 → 내 파티's 전체 / 비공개 / 공개 under the 찾기 / 내 파티 / 초대 tabs.

   Each row gets some space between it and what is above it. Each row's own room comes only from a `minHeight` on a sideways scroller's content, centred, which Android does not appear to keep. Give the room in a way Android keeps, in the shared chip row and in the 행사 tab's own filter row. Other screens that use the shared chip row, such as 내 퀘스트, must still look right.

2. **A public party's card in 찾기 does nothing when pressed.** In 파티 → 찾기 → 모집 중인 파티, pressing anywhere on a card opens that Quest's post (모집글), the same screen `자세히 ›` opens. `관심 없음` and `참여하기` keep doing their own thing and do not open the post. The post card is pressable only when its owner gives it a way to open. 찾기 gives none on purpose, and its comment says so. Change both.

## Acceptance criteria

- [ ] **Room above the chips.**
  - On an Android phone, each of the three chip rows has visible space between it and the element above it. The space is the same in all three rows and fits the design system's spacing.
  - 내 퀘스트's chip row and the catalogue's chip row still look right on Android and in the web build.
- [ ] **찾기's card opens its post.**
  - Pressing a card in 찾기 → 모집 중인 파티, outside its buttons, opens that Quest's post.
  - `관심 없음` hides the post and `참여하기` opens the join sheet, as before, without opening the post.
  - `자세히 ›` still opens the post.
  - The chat's Quest cards, which use the same card, behave as before.
- [ ] **Tests:**
  - a press on a 찾기 card opens `/post/<questId>`, and a press on its `참여하기` or `관심 없음` does not
  - the chip row and the 행사 filters keep their chips pressable and selected as before
  - the existing party and events tab tests pass
- [ ] Checked on an Android phone: the three chip rows and 찾기's cards. Write what was and was not checked under `## Comments`.

## Comments
