# 26: A 파티 only with named Friends is a meeting on the map

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server. The answer is a meet's, which the app already draws.

## What happens now

Found in use (feedback 2026-11-22, item 2a, 3 of 3): "내일 이민수랑 학생회관에서 두시에 만나는 파티" went to proposeQuest. Its reply is a card with no scene, and proposeQuest never reads the Friend's day, so nothing says 이민수 has a Class then.

planMeet fixed a place but not a start: `from` is the window's start, so a fixed time nobody could keep moved silently to the first free time, and the rules forbade naming who was busy.

## What to build

- For an app that draws meets, a 파티 or 약속 only with Friends the User names, with or without a place and a time, is a meeting: the rules send it to planMeet with the place as `placeId` and the time as `at`. proposeQuest keeps an open or approval 파티, or one with a capacity, a Board or a title the User gave.
- planMeet takes `at`, the start the User fixed: the window starts there. Its answer to the model carries `asked: { at, fits, busy? }`. When the first plan does not start at `at`, it is the nearest time everyone can be there, and `busy` names who of the plan is busy then and until when: a Friend by their name only, never what it is or where; the asker by the name of their own Class or Quest too.
- The rules have the line say why and offer the nearest time ("민수는 15:15까지 수업이에요. 15:20은 어때요?"), and nobody outside the plan is named.
- The reply's shape is unchanged: the offer is drawn as any meet plan, with the Friend's busy stretch on its bar.

## Acceptance criteria

- [ ] At a free time the plan starts then and `asked.fits` is true; with a Friend in a Class then, `busy` names the Friend and the Class's end and never the course; with the asker's own Class, its name. (`assistant-meet-at.integration.test.ts`.)
- [ ] Eval `meet-at`: the asked time fits; it does not because of the Friend; it does not because of the asker's own Class; a place only; a time only (a known failure of the eval world's travel table).
- [ ] Lint, format and types of the main server pass.
