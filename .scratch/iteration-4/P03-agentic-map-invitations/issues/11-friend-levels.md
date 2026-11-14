# 11: Three Friend levels, stored and sent

Parent: [P03 spec](../spec.md) ("The three Friend levels")
Status: ready-for-agent
Blocked by: 04, and this package's turn in the order of schema changes

## What to build

Each User chooses for each Friend whether that Friend sees only their Timetable, the building they are in, or their exact position. The server stores the choice on each end of the friendship, works out what a viewer sees as the lower of the two, and sends a viewer at the building level the Place and never the position. The Friends screen offers the three choices in place of today's switch. This is wireframe row "9. 친구와 위치", boards 1 to 3 and 6.

## Acceptance criteria

- [ ] One migration, made from the schema of the iteration branch at this package's turn: `friendships.user_a_level` and `user_b_level` (`timetable`, `building`, `exact`, default `building`) in place of the two sharing switches, with an existing switch that is on turned into `exact` and one that is off into `timetable`.
- [x] What a viewer sees is the lower of the two ends, `timetable` while either Master Switch is off, and `exact` for members of a common Party who both share with it.
- [x] `GET /positions` and the `position` signal give a building viewer the Place's id and point with `level: 'building'`, and nothing while the person is in no Place; an exact viewer gets today's position with `level: 'exact'`. No position of a person reaches a building viewer, in a reply or a signal.
- [x] A viewer is told only when what they see changes: a building viewer when the Place changes, `position-removed` when the person leaves every Place or the level drops to `timetable`, and the Place in place of the position when it drops from `exact` to `building`.
- [x] `PUT /friends/:userId/level` sets the User's end; `PUT /friends/:userId/sharing` keeps working for an app of before (on is `exact`, off is `timetable`); `GET /friends` gives `level`, `sharing`, and `visible`.
- [x] The Friend view gives `building` with the Place and no position; a meal's Plan sets such a Friend out from that Place, and its scene marks them with the source `building` at the Place's point.
- [x] The app's contract has the levels, the position's `level` and `placeId`, and the scene's `building`; its Friends adapter carries a Friend's level; the Friends screen offers "시간표만", "지금 있는 건물", and "정확한 위치" for each Friend in place of the switch.
- [x] Integration tests of each level pair, the Master Switch, a common Party, each change of level with what the other User receives, a building viewer never receiving a position, and the old route; a unit test of the rule; the LQ-4 table test of the design's section 5 starts here with the three levels: the Assistant's answers, a Plan's scene, and the signals say no more than the viewer's level.

## Comments

- The migration, `20261115034749_add_friend_levels`, is provisional: it is made from this branch's schema, and at this package's turn it is made again from the iteration branch's schema of that moment. The first box stays open until then.
- The LQ-4 table test is `main-server/test/friend-levels-lq4.integration.test.ts`. With the level check in `VisibilityService.linkedTo` replaced by "both Master Switches on gives `exact`", 8 of its 9 cases fail, every pair but exact with exact, each on the Friend's coordinates found in what the viewer was given. This was shown once by hand.
- Locally only the test files this ticket touches were run. Under the shared Mac's load many first timed out at 5 seconds; run one file at a time with longer timeouts, each passed. CI runs the rest, the flow tests included.

### Decisions (2026-11-15)

- The rule is a pure function, `levelSeen` in `main-server/src/location-sharing/friend-level.ts`, and `VisibilityService.linkedTo` applies it to each Friend and Party member of a User. `viewersOf` answers each viewer with their level, and `visibleTo` what the viewer sees of each subject in the form `GET /positions` gives, so that the fetch, `GET /friends`'s `visible`, a Party's `visible`, and the Friend view read one answer.
- The migration turns only accepted friendships' switches into levels. A Friend Request that waits keeps the default `building`, because accepting it makes a new friendship, which starts there.
- A Place of a position is what `PlaceLookup.at` gives, inside a Place or within 20 m of it, as the Friend view and the meal Plan already read it. The position store keeps its `placeId` beside the position; a position stored before this change reads as in no Place.
- A building viewer's `measuredAt` is that of the upload the Place was taken from: the upload that changed the Place for a signal, and the latest upload for the fetch and for an announcement.
- `GET /friends`'s `visible` is true only while the User sees the Friend's position or Place, so a Friend at the building who is in no Place is not visible, as one off campus is not.
- Besides the two drops the spec names, `announceRemovals` gives the Place at once to a viewer who sees only the Place after a change and saw nothing before it: a level raised from `timetable` to `building`, or a Master Switch turned on while the other is in a Place. Without it such a viewer would see nothing until the Place changed. A viewer raised to `exact` gets the next upload, as a switch turned on did.
- `PUT /friends/:userId/sharing` maps to the level in the controller; the service has only `setLevel`.
- The demo seed writes `exact` on both ends of the demo friendships and of the friendships it gives a real account, so that the demo's Avatars still walk on the map.
- Tests that took a new friendship to share the exact position now set `exact`: `sharingFriends` takes a level, `exact` unless given, and the flow tests `friend` and `session` set `exact` on both ends.
- In the app, `setFriendLevel` replaces `setFriendSharing` in the client, the server client, and the mock. The mock keeps only the User's end and takes the Friend's to be as high.
- The Friends screen draws each Friend's row itself (Avatar, name, department) with the three levels under it as one segmented track of three cells of one width, "{이름}님에게 보일 위치", a radio group. The note under "친구 {n}" reads "둘 중 낮은 쪽까지만 서로 보여요. 시간표는 계속 보여요".
- The app's live connection still passes on `userId`, `latitude`, `longitude`, and `measuredAt` only, so a building Friend is drawn at the Place's point as before; the map is not changed.

### Open

- The app dims an Avatar whose `measuredAt` is 2 minutes old and drops it at 10 minutes. A building viewer is sent a Place only when it changes, so a Friend who stays in one building leaves that viewer's map after 10 minutes until the app fetches `GET /positions` again (connect, reconnect, return to the front, `friends-changed`). The design's section 7 leaves this "Not decided".
