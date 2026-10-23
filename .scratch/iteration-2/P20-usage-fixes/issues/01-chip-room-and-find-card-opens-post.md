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
- [x] **찾기's card opens its post.**
  - Pressing a card in 찾기 → 모집 중인 파티, outside its buttons, opens that Quest's post.
  - `관심 없음` hides the post and `참여하기` opens the join sheet, as before, without opening the post.
  - `자세히 ›` still opens the post.
  - The chat's Quest cards, which use the same card, behave as before.
- [x] **Tests:**
  - a press on a 찾기 card opens `/post/<questId>`, and a press on its `참여하기` or `관심 없음` does not
  - the chip row and the 행사 filters keep their chips pressable and selected as before
  - the existing party and events tab tests pass
- [x] Checked on an Android phone: the three chip rows and 찾기's cards. Write what was and was not checked under `## Comments`.

## Comments

### Result (2026-10-22)

**Room above the chips.** The vertical room now comes from `paddingVertical: space[3]` (12) on the sideways scroller itself, not from `minHeight: 56` on its content, so Android keeps it. With the 34-high chips the row is 58 high, about the 56 it was meant to be on the web. The same change is in both places:
- `mobile/src/design-system/chip-row.tsx` (`ChipRow`: friend panel, 내 파티, 내 퀘스트, catalogue)
- `mobile/src/screens/events/events-bar.tsx` (`Filters`, the 행사 tab)

**찾기's card opens its post.** `Posts` in `mobile/src/screens/party/find-tab.tsx` now gives `PostCard` an `onOpen` that calls `openPost(questId)`. The comment on `Card` in `mobile/src/screens/party/post-card.tsx` now says the card is pressable when its owner gives it `onOpen`, as 찾기 does, and that a press of one of its buttons does not open it. The chat's Quest cards (`chat-quest-cards.tsx`) were not changed.

**Tests.** `mobile/__tests__/party-find-test.tsx` has a new `a press of a card` block. It checks that a press of the card opens `/post/<questId>`, that `참여하기` opens the join sheet without leaving `/party`, and that `관심 없음` hides the post without leaving `/party`.

**Checked by the agent:**
- `party-find-test.tsx`: 19/19 pass.
- `chip-row-test`, `events-tab-test`, `friend-panel-test`, `party-mine-test`, `quests-screen-test`, `chat-quest-cards-test` and `party-find-mock-test`: 64/64 pass. These cover the chips staying pressable and selected, and the chat cards behaving as before.
- Full mobile suite: 143 suites and 1262 tests pass.
- `pnpm lint` and `pnpm format:check` are clean.
- `pnpm typecheck` is clean once the files `expo start` generates (`mobile/expo-env.d.ts`, `mobile/.expo/`) are moved aside. With them in place, it shows 2 typed-route errors in `__tests__/menus-screen-test.tsx:73` and `__tests__/support/party.ts:141`, which are there without this change too. CI has no such files.

**Not checked by the agent:**
- Anything on an Android phone: the three chip rows' spacing, and pressing 찾기's cards. The user will check these.
- The look of 내 퀘스트's and the catalogue's chip rows on Android and on the web. No screenshots were taken.
- No test asserts the spacing itself.

### Review (#118, 2026-10-22)

AhnJinYoung approved, with three non-blocking notes:
- **Press feedback on the card:** not changed. 내 파티's card (`mine-tab.tsx`) is pressable with no pressed style either, and the design system has no pressed style for a card. Adding one would be a design decision for both cards, not this ticket.
- **Row height 56 → 58:** no change needed. The web check of 내 퀘스트 and the catalogue is still open (see above).
- **typecheck:** confirmed. The errors come from the generated typed routes, and typecheck is clean without them.

### Agent usage (2026-10-22)

- Agent time: about 15 minutes (an estimate), in one session with no subagents. The full jest run takes up most of it.
- Tokens: about 1.55M input, of which about 1.50M were cache reads, about 50k were cache writes and fewer than 100 were uncached. Output was about 11k.

### Phone check (2026-10-23)

Checked by the person (Jaehyun0320) on an Android phone, a Galaxy S22 (SM-S901N), and reported as passing. The build was a debug build of all six P20 branches merged on `origin/2.0/Main` (a local branch, not pushed), against the servers in Docker with the demo profile. Not checked on iOS.

- **Checked on the phone:** the room above the three chip rows (the friend panel, the 행사 tab and 내 파티), 내 퀘스트's chip row, and pressing a card in 찾기 → 모집 중인 파티, which opens its post, while `관심 없음` and `참여하기` keep their own actions.
- **Not checked:** the chip rows in the web build. "Room above the chips" stays unticked for that alone.
