# 05: 참여 중인 파티 as its own screen

Parent: [P20 plan](../plan.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

On 내 정보, pressing 참여 중인 파티 switches to the 파티 tab's 내 파티 at once, with no slide. 친구 관리 and 내 퀘스트 slide in. Back from there goes to the main map, not to 내 정보, because the tabs go back to 지도.

After this ticket:
- **Pressing 참여 중인 파티** pushes a new screen titled 참여 중인 파티 above the tabs. It slides in from the right like 친구 관리, and shows the same list as 내 파티: the same filter chips, cards, empty state and actions, such as entering a room and declining.
- **Back** returns to 내 정보. That covers Android's back button and the screen's own back button, and the edge swipe once ticket 06 lands.
- **The 파티 tab and its 내 파티 do not change.** Everything else that goes to 내 파티, such as after making a Party, keeps going to the 파티 tab as it does now.

Reuse the 내 파티 list inside the app's full-screen panel, instead of writing a second list. Register the new route with the same slide from the right the other screens above the tabs have, and the same no-slide where the phone asks for less motion. Plan item 6 says where each part lives.

## Acceptance criteria

- [x] **It slides in.**
  - Pressing 참여 중인 파티 on 내 정보 slides a 참여 중인 파티 screen in from the right, as 친구 관리 does.
  - With reduced motion on, it appears without sliding, as the other screens do.
- [x] **Back returns to 내 정보.**
  - Android's back button and the screen's back button both return to 내 정보, with 내 정보 as it was.
  - Neither one goes to 지도.
- [x] **Same list as 내 파티.**
  - The screen shows the User's Quests as 내 파티 does, with its 전체 / 비공개 / 공개 chips, cards, empty state, loading and error states.
  - Entering a room from it opens the room, and back from the room returns to this screen.
- [x] **Nothing else moves.** The 파티 tab's 내 파티 and everything that shows it, such as after making a Party or from the AI chat, behave as before.
- [x] **Tests:**
  - pressing 참여 중인 파티 on 내 정보 opens the new route, not the 파티 tab
  - back from it shows 내 정보
  - the screen lists the User's Quests as 내 파티 does
  - the existing 내 정보 and 내 파티 tests pass
- [ ] Checked on an Android phone: the slide in, back to 내 정보, and a room opened from the screen. Write what was and was not checked under `## Comments`.

## Comments

### What was built (2026-10-22)

- **Route.** `mobile/src/app/(signed-in)/me/parties.tsx` shows `MyPartiesScreen`. It is registered in `app/(signed-in)/_layout.tsx` with `slideFrom('right', reduceMotion)`, as 친구 관리 is, so it slides in from the right and appears without sliding when reduced motion is on.
- **내 정보.** In `screens/me/me-screen.tsx`, only the 참여 중인 파티 row changed: it now runs `router.push('/me/parties')` instead of switching to the 파티 tab. Back pops the stack, so both the screen's 뒤로 and Android's back button return to 내 정보 as it was.
- **One list for both places.** `screens/party/mine-tab.tsx` now exports `useMineList()`. It gives 내 파티's chips, its cards (loading, error and empty states, groups, cards) and its confirm sheet, with the filter and the enter and decline actions in one place.
  - `MineTab` puts these together as before: chips, then a `ScrollView`, then the sheet.
  - `screens/me/my-parties-screen.tsx` puts them in `FullScreenPanel`: chips `under` the app bar, cards in the panel's own scroll, the sheet after.
  - The cards' components moved unchanged into `screens/party/mine-card.tsx`, because `mine-tab.tsx` went over the 300-line lint limit.
  - `FullScreenPanel` and `ChipRow` were not changed. `showMine()` still goes to the 파티 tab.
- **Tests.**
  - `__tests__/me-test.tsx`: the 참여 중인 파티 test now expects `/me/parties` and its title, not the 파티 tab. A new `describe` covers back to 내 정보 by the screen's 뒤로 and by Android's back button.
  - `__tests__/party-mine-test.tsx`: a new `describe` checks that `/me/parties` shows the User's Quests and chips as 내 파티 does, shows the empty state, and opens a card's room whose back returns to `/me/parties`.
  - `__tests__/support/app.tsx` registers the new route for `renderRouter`.
  - The existing 내 파티 tests run unchanged against `/party?tab=mine`.

### What was checked, and what was not

- **Checked:** `pnpm lint` and `pnpm format:check` in `mobile/` are clean. `tsc --noEmit` is clean, run with the locally generated `expo-env.d.ts` and `.expo/` moved aside. The new route did not fail typecheck. The whole mobile suite passes: 147 suites, 1,311 tests and 1 todo.
- **Not checked on a device.** Nothing in this ticket was tried on a phone, so the device box stays unticked. The phone check is deferred until after ticket 06, against real data on the Dev Server. The app's mock data was left as it is.
- **Steps for the phone:**
  1. Open 내 정보 and press 참여 중인 파티. A screen titled 참여 중인 파티 should slide in from the right, as 친구 관리 does, over the tabs, and the tab bar should not move to 파티.
  2. Check that it shows what 파티 → 내 파티 shows: the 전체 / 비공개 / 공개 chips with the same counts, and the same cards. Press 비공개 and 공개 to see the list filter.
  3. Press the screen's 뒤로 (‹ at the top left). It should go back to 내 정보, at the same scroll position, not to 지도.
  4. Open 참여 중인 파티 again and press Android's back button. It should also return to 내 정보.
  5. Open 참여 중인 파티, press a card to open its room, then press back. It should return to 참여 중인 파티, and one more back should return to 내 정보.
  6. If a Party is running without you, check that its strip's 거절 and 참여 work here as they do in 내 파티.
  7. Turn on the phone's reduced motion (설정 → 접근성 → 애니메이션 제거, or similar) and open 참여 중인 파티 again: it should appear without sliding.
  8. Check that 파티 → 내 파티, and making a Party, still go to the 파티 tab as before.

### Agent usage (2026-10-22)

Counted from this session's Claude Code transcript (`~/.claude/projects/…/3c73c65a-….jsonl`), from the ticket's first prompt until this count was made. The few calls after it, which wrote this section and committed it, are not in it.

- Agent time: about 17 minutes, in one session. It is an estimate: the sum of each turn's span, from the message that started it to the agent's last reply, plus the 8 minutes the agent waited between turns for the full mobile suite. Time waiting for a person is left out.
- Tokens: 38 calls to Opus 5.5, no subagents.
  - Input: 2,783,369 in all. Of these, 2,711,487 are cache reads, 71,804 cache writes and 78 uncached.
  - Output: 24,514.
