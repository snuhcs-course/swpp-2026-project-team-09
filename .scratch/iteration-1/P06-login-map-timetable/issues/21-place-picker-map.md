# 21: Choosing a Place: pointing on the map

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (Map component and stand-in map), 18 (Choosing a Place: the list and its search), 20 (Private Events)

## What to build

From the Private Event form, a User chooses a spot that is not in the list by moving the map under a pin fixed at its centre, and the app names the spot after the Place it is in or near. The frame is `PlacePickerMap`. The class form does not offer it: a class's Place comes from the list only.

The name follows the main server's own lookup. Until ticket 27 connects ticket 26's route, the app measures to the Places' positions itself, with the same distances.

## Acceptance criteria

- [ ] Opened from the Private Event form, the list's first row is "지도에서 직접 찍기", and the empty state offers it too. Opened from the class form, neither is there.
- [ ] The row opens a map with the pin fixed at its centre, the frame's hint and back button, and the sheet with "이 위치로 정하기".
- [ ] Each time the camera stops, the sheet names the point under the pin: a Place's name and number in the Place or within 5 metres, "{Place} 근처" within 20 metres, and "지도에서 고른 위치" farther from every Place.
- [ ] Confirming a point named as a Place chooses that Place. Any other point is returned as a latitude, a longitude and the label shown.
- [ ] The Private Event form shows the frame's helper under a place chosen on the map, and the long press of ticket 20 names its spot by the same rule.
- [ ] The naming is one function behind the API client, on the fake list, so that ticket 27 replaces it with the server's answer.
- [ ] Jest tests with the stand-in map: the row present and absent by mode, a point in a Place, near one and far from all, the confirmation's result for each, and the helper in the form.
