# 19: A 파티 proposed over the User's own time says so

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [18](18-made-party-not-made-again.md), whose split of proposeQuest's input this builds on.

Native files: none. Releases: the main server.

## What happens now

Found in use (feedback 2026-11-22, item 5): "내일 15시 관정 코딩스터디 4명 승인제로 만들어봐", asked with a Class on that day at 15:00.

- In 3 of 3 runs the 파티 was proposed over the Class without a word. The model does not know a later day's Classes: the line ahead holds today's only, and proposeQuest reads no day.
- In one run, asked again, the model took today's 14:00 Class for tomorrow's, then took it back.

## What to build

- When a Proposal's first 30 minutes, as a Sub Quest with no end fills a day, overlap the asker's own Classes or the Sub Quests of the Quests they hold, proposeQuest's answer adds `clashes`: at most 3, each its kind (`class` or `quest`), name, start and end.
- The Proposal is still shown. The rules have the model say the first and ask whether to keep the time: "내일 15:00엔 운영체제 수업이 있어요. 그래도 만들까요?"
- Only the asker's day is read. An invited Friend's Classes and Quests, their courses and rooms, are never read or named.

## Acceptance criteria

- [ ] A 파티 at a Class's time names the Class with its time, and the Proposal is shown. (`assistant-proposal-clashes.integration.test.ts`, which fails before the change.)
- [ ] A held Quest that the 파티's first 30 minutes reach is named; a 파티 at a free time has no `clashes`.
- [ ] An invited Friend's Class at the 파티's time is never named.
- [ ] The eval cases `proposal-over-a-class` (the reply names the Class and asks) and `proposal-at-a-free-time` (no Class named) pass.
- [ ] Lint, format and types of the main server pass.
