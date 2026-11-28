# 56: The place picker's card stays still while the map moves

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

The user on 2026-11-28, on 파티 만들기 → 장소 검색 → 지도에서 직접 고르기: "지도를 옮기다 보면 순간적으로 껌뻑이면서 하단 카드가 표시돼."

- **The picker** (`mobile/src/screens/place-map/place-map-screen.tsx`) asks the main server which Place is under the pin each time the map comes to rest (`usePlaceAt`, `GET /places/at`).
- **The blink.** The query is keyed by the point and has no placeholder. So at every rest, before the answer comes, the card's words go blank and `이 위치로 정하기` turns grey, then both come back.

## What to build

- `usePlaceAt` gives `shown` and `chosen`.
  - `shown` keeps the last place's words while the next point is asked (`keepPreviousData`).
  - `chosen` is the new point's own answer, undefined until it comes.
  - Both are undefined off the campus.
- The card shows `shown` and stays enabled while it has words. A press gives `chosen` only, so it never gives the previous point.

## Checked

| Place                                                                                                  | Follows the map                                | Was                          | Now                                            |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------------------- | ---------------------------------------------- |
| Place picker (`place-map/place-map-screen.tsx`), opened by the 파티 form's and the room's place sheets | yes                                            | blank and grey at every rest | words kept; the press waits for the new answer |
| Private zone map (`me/private-zones/zone-map.tsx`)                                                     | camera only, no card from the server           |                              | unchanged                                      |
| Main map (`main/use-main-map.ts`)                                                                      | camera for labels, no card that follows a move |                              | unchanged                                      |
| Place on the map sheet (`place-map/place-on-map-sheet.tsx`)                                            | shows a fixed point                            |                              | unchanged                                      |

## Acceptance

- [ ] While a new point is asked the words stay; then they change once (unit test, failing before).
- [ ] Off the campus nothing is shown (unit test).
- [ ] On the phone: moving the map in the picker, the card never blanks.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 11 minutes in the app-fixes session, measured from its transcript (an estimate). That session worked on several tickets at once, so its time and tokens are split by which ticket each step named. Pauses longer than five minutes are not counted.
- Tokens: output 19k; input 26.5M, of which 26.5M cache reads, 38k cache writes and 70 uncached. No subagents.
