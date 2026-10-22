# 04: One marker for everything at one place

Parent: [P20 plan](../plan.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

When several things stand at the same place on the main map, their markers lie on top of each other. Only the top one can be pressed. A Global Event and a Party's Quest at the same building show this: one hides the other, and the hidden one can never be opened. After this ticket, everything at one place is reachable from one marker.

### Which markers group

- Group every place marker that stands at exactly the same coordinates:
  - Global Events,
  - Parties, and Shared Quests drawn as Parties,
  - a Quest the User holds alone,
  - restaurants, while the dining layer is on,
  - shuttle stops, while the shuttle layer is on.
- Markers that are only near each other are not merged.
- People (Friends, Party members, the User) and shuttle vehicles are Avatars. They move, so they stay out of the grouping and keep being drawn on top.

### What the group looks like

- **The marker.** One marker at the place: the usual circle, with a small circle inside it for each kind that is there, in that kind's colour and icon. For example, one for 행사 and one for 파티.
- **One kind only.** Where only one kind stands but more than one of it, the marker stays as it is today. Several Global Events at one point already show one pin with their count.
- **The card.** A press opens a card for the place. It has a chip for each kind there (행사, 파티, 식당, 셔틀 …) and lists the things of the chosen kind. A press on a row opens that thing's own card, as a press on its own marker would.
- **Selection.** While one thing in the group is selected, the group's marker is drawn selected, as the Global Event point is today.

### Today and where to start

- Only Global Events are grouped, into an event point whose card lists them, and each grouped event draws no marker of its own.
- Generalise that grouping to all place markers, running on the full list of the map's cards: the map's, the restaurants' and the shuttle's together.
- Plan item 3 says where each part lives.

## Acceptance criteria

- [ ] **One marker per place.**
  - With a Global Event and a Party's Quest at the same coordinates, the map shows one marker there, with one small circle for each of the two kinds.
  - The same holds for any mix of the kinds above, including restaurants and shuttle stops while their layers are on.
  - Turning a layer off takes its kind out of the group, and a group left with one thing shows that thing's own marker again.
- [ ] **Everything is reachable.**
  - Pressing the group's marker opens the place's card with a chip for each kind there.
  - Choosing a chip lists that kind's things, and pressing one opens its own card with its usual actions, such as 길찾기, 파티 열기, 참여하기, 메뉴 or 셔틀 노선.
- [ ] **Unchanged where nothing overlaps.**
  - A thing alone at its place keeps its own marker and card.
  - People and shuttle vehicles are drawn and pressed as before.
  - Several Global Events at one point and nothing else still show one pin with their count.
- [ ] **Screen reader.** The group's marker reads what is there, such as "행사 1개 · 파티 1개 · 301동".
- [ ] **Tests:**
  - grouping: things at the same coordinates become one group across all place kinds, Avatars never join one, and a group of one is no group
  - the main screen: pressing a grouped marker shows the chips, and choosing a row opens that thing's card
  - the existing map, main-screen and event-point tests pass, updated where the event point's behaviour has moved into the general grouping
- [ ] Checked on an Android phone with real overlapping things, or with mock data that puts them at one place. Write what was and was not checked under `## Comments`.

## Comments
