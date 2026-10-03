# 20: Private Events

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Main screen: event markers, the event card and the walking route), 18 (Choosing a Place: the list and its search)

## What to build

A User presses and holds a spot on the map, creates a Private Event there, and sees it as a teal marker that only they see. A tap on the marker shows its card, from which the User edits it, deletes it or asks for the way there. The frames are `MainLongPress`, `PrivateEventCreate`, `PrivateEventEdit` and `MainPrivatePin`.

Private Events are fake, holding what the spec lists under "What the fakes hold", until the main server serves them. Until ticket 21, a spot that is not a Place is named by the nearest Place's name alone.

## Acceptance criteria

- [ ] A long press on the map, of about half a second without moving and not on a marker, drops a pin there and shows "내 일정 만들기". A touch elsewhere dismisses both.
- [ ] The button opens the form with that spot as the place. The form takes a title of 30 characters at most, a day, a start time, an optional end time on the same day, a place and an optional note of 200 characters at most, and carries the badge "나만 보기".
- [ ] The place can be changed to a Place from the list of Places.
- [ ] Save is enabled once the title, the day, the start time and the place are there, and the end, when given, is after the start.
- [ ] After saving, the map moves to the marker and opens its card.
- [ ] A Private Event of today or later is a marker of the `private` kind, with the detail by zoom that other markers have. One of a past day is not on the map.
- [ ] The card shows "내 일정 · 나만 보기", the title, the time written as the frame writes it, the place and the note, with "수정" and "길찾기". "길찾기" behaves as on an event's card.
- [ ] "수정" opens the form filled in, with "삭제". Deleting asks first with the frame's dialog and then shows the frame's toast.
- [ ] Creating carries an `Idempotency-Key`, and its button is disabled while the request is pending.
- [ ] Jest tests with the stand-in map: the long press and its dismissal, a Private Event created at the spot, the save button's conditions, the marker and its card, a past day's event absent, an edit, a delete with its confirmation, the route from the card, and the key on creating.
