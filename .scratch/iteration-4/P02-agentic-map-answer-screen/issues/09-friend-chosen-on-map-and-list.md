# 09: A Friend is chosen on the map or in the list, and the map answers at once

Parent: [P02 spec](../spec.md) ("Correcting the answer")
Status: ready-for-agent
Blocked by: 03, and an emulator check that a press on a Friend's face during a Plan adds the Friend

## What to build

"＋ 같이" lists the Friends in the card, and a Friend's face on the map adds the Friend too; the two are linked. A press on either starts one pending add: the pressed cell reads "넣는 중", the Friend's face takes the selected look at once, and when the recalculated answer arrives the list closes and the camera moves once to the new Plan. Every face that can be added carries a "+" badge.

## Acceptance criteria

- [x] **One pending add**, shared by the list and the map: while it is on its way the pressed cell reads "넣는 중" with a small spinner, and every other cell, chip, and face takes no press. A failure clears it and shows the toast of a failed recalculation.
- [x] **The face lights at once**: in the same frame the pressed Friend's face takes the map's selected look. A face that is off screen or hidden near a mark of the Plan changes nothing.
- [x] **One move**: when the answer arrives the list closes and the camera moves once, after the drawing and the card's height have been still for about 120 ms.
- [x] **The "+" badge** on every face that can be added (a Friend not in the conditions), a small circle at the face's upper right, as the "?" and "✓" badges are drawn; its look and the selected look are asked for ahead.
- [x] The open list's second line reads "지도의 얼굴을 누르거나 아래에서 골라요" (in place of "가까운 친구부터 보여요").
- [x] A wrong add is undone with that person's ✕ in the chip row.
- [x] Tests at the main screen over the fake main server for each of the above, and the README.
- [ ] The screen is run on an Android emulator: a press on a face during a Plan, an add of a Friend with no position, and two Friends in one building; the pull request carries the pictures.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

From the decision of 2026-11-15 on choosing a Friend (`answer-screen-design/decision.md` in the sessions' notes, moments 3 to 6 of `map-or-list.md`). The user asked: "그리고 내 상상에는 지도 상에서 사람을 클릭하는 건줄 알았는데 결국 하단의 채팅 구역에서 고르는게 맞는건가. 지도에서 사람 선택은 어려워 보이기도 하고 더 팬시한 것 같기도 하고. 정확히 모르겠다. 너가 잘 판단해줘", and "목록에서 클릭을 할 때 지도에서 줌인 줌 아웃 클러스터링이 되는 효과가 있어도 좋고". Circles that merge and split faces are a later ticket of their own.

### Decisions (2026-11-15)

1. The pending add is held with the answer on screen (`pendingAdd` and `add` of `useShownAnswer`), beside `recalculating`, so that the list, the map, and the card read one Friend id. A cell and a face both call `add`, which is `change` with the Friend added and that id held; a second press of either is dropped, as a second `change` is.
2. The list closes only with the answer to the add it holds. A ✕ pressed while the list is open leaves it open when its answer comes, as before. A failure clears the pending add and leaves the list as it was.
3. The pending cell reads "넣는 중" with a spinner of 16 before it, on `color.blue50`, and takes no press; the other cells are disabled and dimmed as during any recalculation. The design system's `ChoiceGrid` gained `busy` on a choice for it; a screen reader hears "민준, 넣는 중".
4. "그대로" still takes a press while an add is on its way: it closes the list and the add goes on. It is not a chip, and nothing is lost by closing.
5. The lit face is the everyday look with `selected`, drawn above the other Avatars (`SELECTED_ORDER`), without its "+". Its "+" is a 14-point navy (`color.snuBlue`) circle with a white "+" at the upper right of the face's box, as the wireframe kit draws a "+" badge, in the size of the answer's "?" and "✓". A "+" goes on every face of a Friend whose id is not in the conditions; a member of the User's Party who is no Friend has none. After "이대로 초대" no face has one; while the invitation is on its way the "+" stays, as the chips stay, and the face takes no press.
6. The "+" look and the selected look of each face with a "+" are asked for together while the answer is on screen. A face whose new look has no picture yet keeps the picture it has until the new one is made, so a native map never leaves a face out, also at the answer's first show and after a change of the zoom's detail.
7. The camera waits for stillness only after an answer replaced another on screen (a recalculation, "되돌리기", or a reply with an answer to words), and then moves once, 120 ms after the drawing, the card's height, and the stage last changed. The first answer, the arrows, a candidate pressed, and a change of the card's height at any other time (the list opened, the basis opened) move it at once, as before. An answer without a Plan draws nothing and moves nothing. The Android height shift of ticket 06 is untouched.
