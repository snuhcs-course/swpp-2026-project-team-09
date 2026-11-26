# 10: The room ticket and its choosers

Parent: [P10 spec](../spec.md) § With Friends; design `group-study-design` ③ to ⑤ and state 가, `group-study-resume` 2-2
Status: ready-for-agent
Blocked by: 09

Native files: none. Releases: with ticket 11.

## What to build

The seat ticket of PR 625 (`mobile/src/screens/main/library/seat-ticket.tsx`) becomes the ticket both answers draw: two cells with a dashed divider, a caption over a bold value in each, and a chevron. The seat answer keeps its look; the room answer fills it so:

- **Left cell:** "그룹스터디룸 · " with the people count emphasized ("4명"), over the room kind with its floor ("4층 6인실").
- **Right cell:** "방" over the room number ("G412").
- **States:**
  - a cell whose chooser is open shows its chevron up, on the light sky ground (#eaf5fb);
  - a ticket that cannot be sent is dimmed to 0.45, its count red (#c2411f) and its kind replaced by the reason ("4명부터");
  - a locked ticket (sent) has no chevrons;
  - the booked ticket is the recommended option 나: the light sky ground with a sky border, a ✓ chip, "예약됨" and " · 내일(금) 15:00–17:00" over the kind, the room on the right, no chevrons. The seat ticket's booked look is P01 ticket 15 (built by another session): the room ticket reuses it once it lands, and draws its own until then only if this ticket comes first;
  - logged out of the library, as the seat ticket does it: the right cell keeps its label "방" with no value and no chevron, and cannot be pressed. The room number is chosen once logged in.
- **The room chooser** (left cell):
  - the free rooms of each kind are read from the library when the chooser opens, kept for a minute and read again when older, as the room list does since PR 616. A count not yet known leaves its place empty;
  - a hint "<time>에 빈 방", then each floor's label ("2층", "4층") over its kinds as equal cells, two to a row, the name at the left and its count at the right ("6인실 빈 방 11");
  - a kind that does not fit is grey with its reason ("8인실 6명부터");
  - the room the answer chose is marked by its `spaceId`, since 2층 and 4층 both have a "6인실".
- **The room number chooser** (right cell): a hint "<time>에 빈 방 N곳" over the kind's rooms free for the whole time, three equal cells to a row. The first free room is chosen at the start.
- **The use line** "사용 용도 · 과제 ›" under the ticket opens the use chooser: the group's `useDescOptions` as equal cells. The use picked is kept on the phone and offered first next time.
- Equal cells follow the app's choice grid (`design-system/choice-grid.tsx`): name left, count right, never uneven pills.

## Acceptance criteria

- [ ] The seat answer's ticket is unchanged (its tests pass as they are).
- [ ] The room ticket shows the kind, the count and the room. Opening a cell lights it and flips its chevron. A dimmed ticket shows the reason. The locked ticket has no chevrons. The booked ticket shows ✓ 예약됨 on the light sky ground. (Unit tests.)
- [ ] The room chooser shows each floor's kinds as equal cells with their counts and greys a kind that does not fit with its reason. Choosing a kind asks the answer again with `chosen.roomSpaceId`. (Unit test.)
- [ ] The kinds' free rooms are read when the chooser opens, not read again within a minute, and read again after it; a count not yet read leaves its place empty. (Unit test.)
- [ ] Logged out, the right cell shows "방" alone, with no chevron, and does not open. (Unit test.)
- [ ] The room number chooser shows only rooms free for the whole time, three to a row, the first chosen. (Unit test, with the library's room list.)
- [ ] The use chooser shows the options as equal cells, and the use picked is offered first the next time. (Unit test.)
- [ ] Whole lint, format and types.

## Comments
