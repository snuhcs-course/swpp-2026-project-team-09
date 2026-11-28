# 66: 파티 만들기 stays where it was scrolled when 공개 범위 changes or 관련 행사 고르기 closes

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

The user on 2026-11-28: "파티 만들기에서 비공개를 누르면 스크롤이 초기화되면서 화면을 다시 그리는 듯 하네."

- **비공개.** The form is not drawn anew. Under 비공개, 참여 방식 and 게시판 leave, about 350 high, so the page becomes shorter than the screen. The scroll can then only stand at the top.
- **관련 행사 고르기.** The picker took the page's place (`Form` returned one or the other). Coming back drew the page anew, at its top.

## What to build

- The page keeps the tallest height it has had as its least height. Rows that leave leave blank room under the page, and the scroll stays where it was.
- The event picker opens over the page, which stays drawn under it, as the place picker already does.

## Checked

| Control of the form                    | Was                                  | Now                       |
| -------------------------------------- | ------------------------------------ | ------------------------- |
| 공개 → 비공개                          | page shorter than the screen, to top | stays; blank room below   |
| 비공개 → 공개                          | rows come back under the scroll      | unchanged                 |
| 참여 방식, 게시판 chips, 인원 ±        | no change of height                  | unchanged                 |
| 날짜·시간 (sheet), 친구 초대 (sheet)   | over the page                        | unchanged                 |
| 장소 검색 (sheet, `/place-map` screen) | over the page                        | unchanged                 |
| 관련 행사 고르기, ‹ or Android's back  | page drawn anew at its top           | the same page, same place |
| A required field marked by the button  | scrolls to it                        | unchanged                 |

## Acceptance

- [ ] After 비공개 the page keeps its height (integration test, failing before).
- [ ] After 관련 행사 고르기 the page is the same one, by ‹ and by Android's back (integration test, failing before).
- [ ] On the phone: scroll down, press 비공개; nothing moves but the two rows leaving.

## Comments
