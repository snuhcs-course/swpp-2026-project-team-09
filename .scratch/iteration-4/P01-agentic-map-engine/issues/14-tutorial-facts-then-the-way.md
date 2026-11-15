# 14: A Tutorial question in words first, then the way there and back

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md); design section 6.5
Status: needs-triage
Blocked by: 13, and package C's reply `offers` (row 8, P02-10) for the "가는 길 보기" button

## What to build

"학생증 어디서 받아?" is answered in words first, with no map change: the place, how to apply, and the opening hours, from the Tutorial content, with the button "가는 길 보기" (board q11). Pressed, the button shows the way there and back before the next Class: the shuttle weighed against walking, the time at the place, and the walk on to the Class (board q12: "셔틀로 가면 12:08 도착 / 13:00 수업 전에 다녀올 수 있어요").

## Acceptance criteria

- [ ] The text answer comes from `getTutorial` as today, and the reply offers "가는 길 보기" through package C's reply `offers`.
- [ ] `findWay` takes a stay at the Place (`stayMinutes`). The way then goes on to the next item, and the lines say whether the User is back in time.
- [ ] Unit and integration tests.

## Notes

The button needs a reply that carries buttons without being a refusal. When package C's P02-10 lands, this ticket is triaged against its `offers` shape.

## Comments
