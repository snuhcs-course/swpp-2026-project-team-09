# 52: 파티's search moves into the app bar as 행사's, and 파티 만들기 floats over the list as a pencil

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: 50 (PR 763), as this branch is built on it.

Native files: none. Releases: an app OTA update only.

## What happens now

The user, on 2026-11-28: "검색창 위치가 일관성 있었으면 좋겠네." The two tabs place their search differently:

- **행사:** the magnifier is in the app bar's top right; pressed, the title's row becomes the field and ✕ (`events-screen.tsx`, `events-bar.tsx`'s `SearchBar`).
- **파티:** the magnifier sits at the right end of 찾기's board chips; pressed, the chips become the field, the search runs over every board, and ✕ brings the chips back at 전체 (`find-bar.tsx`, `find-tab.tsx`). The app bar holds "+ 만들기".

The options were drawn on a page (sections 가, 가-1 and 다). The user chose 다, with a pencil in place of the plus ("팀원이 + 대신 연필 모양이면 좋겠대"), and later asked for the button on all three inner tabs with room under the lists ("밑에 여백을 두어서 스크롤을 다 하면 다 보이도록").

## What to build

1. **One header search.** `TabScreen` takes a `search` and draws:
   - the magnifier at the app bar's top right;
   - once pressed, the title's row as the shared `SearchField`, focused at once so the keyboard rises, and ✕ "검색 닫기".
   - Android's back closes an open search before it leaves the tab, only while that tab is in front.

   행사 and 파티 both use it, and `events-bar.tsx`'s `SearchBar` goes.
2. **파티's search.**
   - It narrows 찾기 within the board chosen; the chips stay and keep working.
   - Opened on 내 파티 or 초대, it shows 찾기 with the field open; leaving 찾기 closes it.
   - ✕ keeps the board.
   - The header "+ 만들기" goes, and so do the magnifier and the field in 찾기's chip row.
3. **One floating action.** `FloatingActionArea` (design system):
   - a navy rounded square of 56 (corner 16) with a white pencil and the navigation action's shadow, 16 from the right and 12 above the bottom, labelled "파티 만들기", opening the 파티 form;
   - on 찾기, 내 파티 and 초대;
   - it gives way while the keyboard is up.

   Every list inside ends with `useListEnd`, which keeps `FLOATING_ACTION_ROOM` (56 + 12 + 16) free, so that the last card scrolls wholly above the button.
4. **Left as it is:** the bottom tab bar's centre ＋ and the tab tour.

## Acceptance

- [ ] 파티's header has the magnifier and no 만들기; the floating 파티 만들기 is on all three tabs and opens the form (integration test, failing before).
- [ ] The search keeps the chosen board, opens focused, goes to 찾기 from 내 파티, closes when leaving 찾기, and closes with Android's back (integration tests, failing before).
- [ ] Each list's end room equals `FLOATING_ACTION_ROOM`; the button is gone while the keyboard is up (integration tests).
- [ ] 행사's search behaves as before on the shared part (integration test).

## Comments
