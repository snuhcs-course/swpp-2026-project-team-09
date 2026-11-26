# 86: A meal answer with a Plan has no row of buttons under its list

Parent: [P04 spec](../spec.md)
Status: ready-for-agent

Blocked by: none.

Native files: none. Releases: a main server deploy and an app OTA update.

## What happens now

Under a meal answer's list, in the same scroll, one row can hold:

- 되돌리기, 96 wide, while the band of the Plan shown before a drag is kept, with that band drawn as a dashed outline on the time bar;
- 처음으로, on a Plan eased from 지금;
- the answer's offers 위치 켜기 and 시간표 넣기, as secondary buttons, with the note "시간표를 넣으면 나설 시각까지 알려 드려요" above the row when there is no Class.

The row sits at the end of the list, out of sight with several Restaurants. Buttons of different kinds look the same, and 위치 켜기 says nothing of why to turn the location on.

## What to build

The user's decision (2026-11-26), boards "밥 답 밑 단추: 개선안": "위치 권한이 없을 때", "위치는 있고 시간표가 없을 때", "위치도 시간표도 없을 때".

1. 되돌리기 goes, and with it the outline of the band before a drag. A drag is undone by dragging back. The dashed outline of the band's own place while it is dragged whole stays.
2. 처음으로 goes from the card.
3. 위치 켜기 and 시간표 넣기 become hint lines, one each: see-through, directly under the reply's words and above the list, the whole line pressed, a "›" at its end, no button and no confirm.
   - The words: "위치를 켜면 지금 있는 곳에서 가까운 순으로 봐요" and "시간표를 넣으면 나설 시각까지 알려 드려요". The second is the present note, which is then not drawn again.
   - With both missing, two lines, the location first.
   - The main server sends the words as an offer's `hint`. The change is additive: the note stays, and an installed app that does not know `hint` still shows its old buttons.
4. A press on the location hint asks for the permission as now. Once a position on campus is known, the answer is asked again once (`recalculateAnswer`, no model call), the same conditions from where the User is.
5. Nothing else moves:
   - the relax buttons of an answer without a Plan;
   - the stepper;
   - row four of other answer kinds;
   - the main button beside the input;
   - the offers of an answer without a Plan, which stay buttons.

## Acceptance criteria

- [ ] Tests fail on the code before:
  - the hint lines' place and words, one or both;
  - the note said once;
  - each hint's screen;
  - an offer without a hint drawn as a line of its label;
  - the answer asked again once after the location is allowed;
  - no 되돌리기, outline, or 처음으로 after a drag or on an eased Plan;
  - the server's offers with their hints;
  - the app's check of `hint`.
- [ ] Every test, mock answer and catalogue screen that named 되돌리기, 처음으로, `plan-steps` or the ghost follows the rule.
- [ ] No native file changes; lint, format and types pass on the app and the main server.

## Comments
