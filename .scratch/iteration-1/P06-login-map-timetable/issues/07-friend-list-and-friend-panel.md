# 07: Main screen: the friend list and the friend panel

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Main screen: the map, the bottom navigation and my position)

## What to build

The main screen gains its friend list on the left and the friend panel that opens from it, as the frames `Main`, `MainFriends` and `MainCollapsed` show. The Friends and their positions are fake, in a provisional shape that follows the glossary and P08's spec, behind an adapter of their own. P08 and P14 connect them.

## Acceptance criteria

- [ ] The list shows the pill with the count of Friends and the Friends' rows, and collapses and expands as in the frame.
- [ ] A tap on a Friend's row moves the map to that Friend's Avatar, or shows the frame's toast for a Friend whose location is off.
- [ ] Friends' Avatars are on the map in the wireframe's 지금 design.
- [ ] The panel opens from the pill with its search, status chips, rows with "약속 잡기" and the badge that counts the Friends sharing their location, and closes as in the frame.
- [ ] "친구 추가" shows the "준비 중이에요" toast. "공유 설정" opens the location sharing part of 내 정보 once ticket 15 exists, and the toast until then.
- [ ] The fake data's shape is marked as provisional, and the screens read it through one adapter.
- [ ] A light Jest test: the list appears, collapses, and the panel opens and closes.
