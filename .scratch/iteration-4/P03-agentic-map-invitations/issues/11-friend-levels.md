# 11: Three Friend levels, stored and sent

Parent: [P03 spec](../spec.md) ("The three Friend levels")
Status: ready-for-agent
Blocked by: 04, and this package's turn in the order of schema changes

## What to build

Each User chooses for each Friend whether that Friend sees only their Timetable, the building they are in, or their exact position. The server stores the choice on each end of the friendship, works out what a viewer sees as the lower of the two, and sends a viewer at the building level the Place and never the position. The Friends screen offers the three choices in place of today's switch. This is wireframe row "9. 친구와 위치", boards 1 to 3 and 6.

## Acceptance criteria

- [ ] One migration, made from the schema of the iteration branch at this package's turn: `friendships.user_a_level` and `user_b_level` (`timetable`, `building`, `exact`, default `building`) in place of the two sharing switches, with an existing switch that is on turned into `exact` and one that is off into `timetable`.
- [ ] What a viewer sees is the lower of the two ends, `timetable` while either Master Switch is off, and `exact` for members of a common Party who both share with it.
- [ ] `GET /positions` and the `position` signal give a building viewer the Place's id and point with `level: 'building'`, and nothing while the person is in no Place; an exact viewer gets today's position with `level: 'exact'`. No position of a person reaches a building viewer, in a reply or a signal.
- [ ] A viewer is told only when what they see changes: a building viewer when the Place changes, `position-removed` when the person leaves every Place or the level drops to `timetable`, and the Place in place of the position when it drops from `exact` to `building`.
- [ ] `PUT /friends/:userId/level` sets the User's end; `PUT /friends/:userId/sharing` keeps working for an app of before (on is `exact`, off is `timetable`); `GET /friends` gives `level`, `sharing`, and `visible`.
- [ ] The Friend view gives `building` with the Place and no position; a meal's Plan sets such a Friend out from that Place, and its scene marks them with the source `building` at the Place's point.
- [ ] The app's contract has the levels, the position's `level` and `placeId`, and the scene's `building`; its Friends adapter carries a Friend's level; the Friends screen offers "시간표만", "지금 있는 건물", and "정확한 위치" for each Friend in place of the switch.
- [ ] Integration tests of each level pair, the Master Switch, a common Party, each change of level with what the other User receives, a building viewer never receiving a position, and the old route; a unit test of the rule; the LQ-4 table test of the design's section 5 starts here with the three levels: the Assistant's answers, a Plan's scene, and the signals say no more than the viewer's level.

## Comments
