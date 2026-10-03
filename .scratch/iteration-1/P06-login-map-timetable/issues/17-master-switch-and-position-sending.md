# 17: The Master Switch and sending the position

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Main screen: the map, the bottom navigation and my position), 15 (내 정보 screen)

## What to build

A User turns Location Sharing on with the Master Switch on 내 정보, after reading who will see their location, and turns it off at any time. While it is on and the app is open, the app sends its position. Where the position is sent and where the switch is stored are fake until P08.

## Acceptance criteria

- [ ] The switch "친구와 위치 공유" on 내 정보 is off until the User turns it on.
- [ ] The first time a User turns it on on this phone, the dialog with the spec's words appears, and the switch turns on only on "켜기". The phone remembers the confirmation for that User.
- [ ] Without the location permission the switch shows the explanation before the location prompt first, and stays off when the permission is refused.
- [ ] While the app is open and the switch is on, the app sends its position every 5 seconds, and only when the User moved by 5 metres or more since the last one sent. It sends positions off campus too.
- [ ] Turning the switch off, signing out and a replaced Session stop the sending at once.
- [ ] Nothing is sent while the app is in the background.
- [ ] The fake records what was sent, so that a test and a developer can see it.
- [ ] Jest tests with a fake position and fake time: off at first, the dialog and both of its answers, no dialog the second time, the permission refused, a position sent after a move and not without one, and the sending stopped by the switch, by sign-out and by a replaced Session.
