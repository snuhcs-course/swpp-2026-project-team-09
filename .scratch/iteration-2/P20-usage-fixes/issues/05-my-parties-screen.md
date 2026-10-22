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

- [ ] **It slides in.**
  - Pressing 참여 중인 파티 on 내 정보 slides a 참여 중인 파티 screen in from the right, as 친구 관리 does.
  - With reduced motion on, it appears without sliding, as the other screens do.
- [ ] **Back returns to 내 정보.**
  - Android's back button and the screen's back button both return to 내 정보, with 내 정보 as it was.
  - Neither one goes to 지도.
- [ ] **Same list as 내 파티.**
  - The screen shows the User's Quests as 내 파티 does, with its 전체 / 비공개 / 공개 chips, cards, empty state, loading and error states.
  - Entering a room from it opens the room, and back from the room returns to this screen.
- [ ] **Nothing else moves.** The 파티 tab's 내 파티 and everything that shows it, such as after making a Party or from the AI chat, behave as before.
- [ ] **Tests:**
  - pressing 참여 중인 파티 on 내 정보 opens the new route, not the 파티 tab
  - back from it shows 내 정보
  - the screen lists the User's Quests as 내 파티 does
  - the existing 내 정보 and 내 파티 tests pass
- [ ] Checked on an Android phone: the slide in, back to 내 정보, and a room opened from the screen. Write what was and was not checked under `## Comments`.

## Comments
