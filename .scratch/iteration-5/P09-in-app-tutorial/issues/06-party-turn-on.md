# 06: Chapter 2 ★: the 파티 turned on, and 관악이 on the map

Status: ready-for-agent
Blocked by: 05.

Native files: none. Releases: an app OTA update only.

Spec: [../spec.md](../spec.md).

## What to build

The last step of chapter 2: the User turns on the 승인제 파티 that 관악이 joined, and sees 관악이 on the map.

- **Turning it on.** 샤샤 points at the room's turn-on control: "켜면 이 파티 사람들끼리만 위치가 보여. 끄면 바로 안 보여." The User turns it on in Practice.
- **The map.** The Tour moves to the map, where 관악이's position shows as a member of the running 파티, and the 활성 파티 row shows.
- **The User's own location.** In Practice, turning on needs no Master Switch, and asks for no permission it does not already have. The User's real Location Sharing is not changed.
- **The end of the chapter.** The chapter ends there, and the Tour goes on to the next chapter.

## Acceptance criteria

- [ ] Turning the 파티 on in Practice shows 관악이 on the map and the 활성 파티 row.
- [ ] The User's real Master Switch and sharing levels are unchanged after the Tour.
- [ ] The fake main server receives no turn-on and no Party membership.
- [ ] After the Tour no 활성 파티 is left.
- [ ] The app-level integration test covers the step.
