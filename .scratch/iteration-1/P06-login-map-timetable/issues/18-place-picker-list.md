# 18: Choosing a Place: the list and its search

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Design system), 02 (API client and fake API)

## What to build

A User chooses a Place from the list of the campus's Places, by scrolling or by searching a name or a building number. The screen is the frame `PlacePicker` in its list view, with `PlacePickerClass` and `PlacePickerEmpty`. The class form (ticket 19) and the Private Event form (ticket 20) open it. The Places and their search are the main server's, which exist.

"지도에서 직접 찍기" is ticket 21; here its row is absent.

## Acceptance criteria

- [ ] The screen opens over the form that asked for it, with the frame's header and search field, and closes with the back arrow without a choice.
- [ ] The list is the main server's Places in the server's order. A row shows the Place's name and, when it has one, its number as "{number}동". The Place already chosen carries the frame's check.
- [ ] Typing searches through the main server's search, by a name or by a number with or without "동".
- [ ] A search that finds nothing shows the frame's empty state with the words for the screen's mode.
- [ ] A tap on a row chooses that Place at once and returns to the form.
- [ ] The list has loading and error states.
- [ ] Jest tests against the fake API in the server's shape: the list, a search by name and by number, the empty state, a choice and a back without one.
