# 08: Main screen: the Quest list, its full view and the Meetup sheet

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Main screen: the map, the bottom navigation and my position)

## What to build

The main screen gains its Quest list on the right, the full-screen Quest view and the Meetup sheet ("개인 약속"), as the frames `Main`, `MainQuests` and `MainCollapsed` show. The Quests are fake, in a provisional shape that follows the glossary and P08's spec, behind an adapter of their own. P08 and P13 connect them.

## Acceptance criteria

- [ ] The list shows the pill with the count and today's Quests joined by the frame's rail, with "오늘 일정 없음" when there are none, and collapses and expands as in the frame.
- [ ] The full-screen view opens from the list with the chips 전체, 강의, 파티 and 약속 and the groups 오늘, 내일, 이번 주 and 이후.
- [ ] A tap on a Class Quest moves the map to its Place. A tap on a Meetup's row opens the Meetup sheet. A row that leads to the party or events screen shows the "준비 중이에요" toast.
- [ ] The Meetup sheet shows what the frame shows and closes as in the frame.
- [ ] The fake data's shape is marked as provisional, and the screens read it through one adapter.
- [ ] A light Jest test: the list appears, collapses, the full view opens and filters, and the sheet opens and closes.
