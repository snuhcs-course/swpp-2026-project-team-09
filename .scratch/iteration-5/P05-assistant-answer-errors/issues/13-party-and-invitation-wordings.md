# 13: Small wordings of 파티 and invitations

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [07](07-times-carry-their-day.md), which changes the same recruiting lines.

Native files: none. Releases: an app OTA update and the main server.

## What happens now

- A 파티 with one step shows "민수랑 학생회관에서 만나기 · 학생회관": the step takes the 파티's title, which already holds the place.
- The model writes a description under the 파티's table that repeats the table.
- A new recruiting activity with no end is given 30 minutes: "19:00–19:30 · 30분".
- The sheet after a first invitation says "내 파티에 처음 들어왔어요", naming nobody, about a Friend only invited.

## What to build

- A step whose title is the 파티's title shows its place alone.
- The rules give a closed 파티 (비공개) no description unless the User gave one.
- An activity with no end shows its start alone.
- The sheet names the Friend and says they were invited ("지우를 처음 초대했어요").

## Acceptance criteria

- [ ] A one-step 파티 does not repeat its place. (Unit test, fails before the fix.)
- [ ] A recruiting answer for an activity with no end has no "30분". (Unit test, fails before the fix.)
- [ ] The sheet names the Friend. (Test, fails before the fix.)
- [ ] An evaluation case: a closed 파티 with a named Friend gets no description.
- [ ] Lint, format and types of the app and the main server pass.

## Comments
