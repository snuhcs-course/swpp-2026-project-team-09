# 09: A Friend is chosen on the map or in the list, and the map answers at once

Parent: [P02 spec](../spec.md) ("Correcting the answer")
Status: ready-for-agent
Blocked by: 03, and an emulator check that a press on a Friend's face during a Plan adds the Friend

## What to build

"＋ 같이" lists the Friends in the card, and a Friend's face on the map adds the Friend too; the two are linked. A press on either starts one pending add: the pressed cell reads "넣는 중", the Friend's face takes the selected look at once, and when the recalculated answer arrives the list closes and the camera moves once to the new Plan. Every face that can be added carries a "+" badge.

## Acceptance criteria

- [ ] **One pending add**, shared by the list and the map: while it is on its way the pressed cell reads "넣는 중" with a small spinner, and every other cell, chip, and face takes no press. A failure clears it and shows the toast of a failed recalculation.
- [ ] **The face lights at once**: in the same frame the pressed Friend's face takes the map's selected look. A face that is off screen or hidden near a mark of the Plan changes nothing.
- [ ] **One move**: when the answer arrives the list closes and the camera moves once, after the drawing and the card's height have been still for about 120 ms.
- [ ] **The "+" badge** on every face that can be added (a Friend not in the conditions), a small circle at the face's upper right, as the "?" and "✓" badges are drawn; its look and the selected look are asked for ahead.
- [ ] The open list's second line reads "지도의 얼굴을 누르거나 아래에서 골라요" (in place of "가까운 친구부터 보여요").
- [ ] A wrong add is undone with that person's ✕ in the chip row.
- [ ] Tests at the main screen over the fake main server for each of the above, and the README.
- [ ] The screen is run on an Android emulator: a press on a face during a Plan, an add of a Friend with no position, and two Friends in one building; the pull request carries the pictures.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

From the decision of 2026-11-15 on choosing a Friend (`answer-screen-design/decision.md` in the sessions' notes, moments 3 to 6 of `map-or-list.md`). The user asked: "그리고 내 상상에는 지도 상에서 사람을 클릭하는 건줄 알았는데 결국 하단의 채팅 구역에서 고르는게 맞는건가. 지도에서 사람 선택은 어려워 보이기도 하고 더 팬시한 것 같기도 하고. 정확히 모르겠다. 너가 잘 판단해줘", and "목록에서 클릭을 할 때 지도에서 줌인 줌 아웃 클러스터링이 되는 효과가 있어도 좋고". Circles that merge and split faces are a later ticket of their own.
