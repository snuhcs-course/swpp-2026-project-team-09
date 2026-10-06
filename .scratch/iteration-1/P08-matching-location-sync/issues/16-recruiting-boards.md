# 16: Recruiting boards and the Quest's description

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A Quest that gathers people in public is posted on a board, as the wireframe's 파티 tab draws it: `식사 게시판`, `진로 게시판`, `취미 게시판` and `공연 게시판`. Every Quest can carry a description, the text of its recruiting post (the frames' `본문`). The Leader sets both when making the Quest and changes them later. The list of recruiting Quests can be narrowed to one board, and every answer that holds a Quest says its board, its description and when it was made, so that the app shows a board's posts newest first and marks the posts of today.

P13's board screens and its 파티 만들기 form build on this ticket.

## Acceptance criteria

### The board and the description

- [ ] A Quest has a `board`, one of `meal`, `career`, `hobby` and `show`, or none. An Open or an Approval Quest always has one, and a Closed Quest never has one. The migration enforces this with a check, so that no way of storing a Quest breaks it.
- [ ] A Quest has a `description` of 0 to 200 characters, empty by default, under every Join Policy. The migration checks the length.
- [ ] Attending a Global Event, an accepted Meetup and a match create Closed Quests, as before, with no board and an empty description.

### Setting them

- [ ] `POST /quests/own` takes `board` and `description`, both optional in the schema.
  - With `joinPolicy` `open` or `approval` and no `board`, it is refused with 400 and a message naming `board`.
  - With a `board` and a Closed Quest, whether `joinPolicy` is `closed` or left out, it is refused with 400 and a message naming `board`.
  - A `description` over 200 characters gets 400 and a message naming `description`.
- [ ] `PATCH /quests/:questId` (the Leader's) takes `board` and `description` beside `title`, `capacity` and `joinPolicy`. What is left out stays, and the Quest it leads to is checked:
  - an Open or Approval Quest without a board, whether from the body or stored, is refused with 409 `BOARD_REQUIRED`;
  - a `board` in a body that leaves the Quest Closed is refused with 409 `BOARD_FOR_CLOSED_QUEST`;
  - a change to Closed without a `board` clears the stored board;
  - a `description` of `""` clears it.

  A Quest for a Global Event takes a board and a description like any other. Only its title stays the event's.
- [ ] A refused change stores nothing, and `quests-changed` goes out as for any change of the settings.

### Reading them

- [ ] Every answer that holds a Quest gains `board`, `description` and `createdAt`: the Quest of `GET /quests`, `GET /quests/:questId` and the routes that answer a Quest, the entries of `GET /quests/recruiting`, and the Quest inside the requests to join and the invitations (`GET /quest-join-requests`, `GET /quest-invitations`). A Class Quest answers `board: null`, `description: ""` and `createdAt: null`.
- [ ] `GET /quests/recruiting?board=meal` answers the recruiting Quests of that board. It works with `globalEventId` too. The order stays the newest first, by `createdAt`. A `board` outside the four gets 400.

### Existing rows, records and checks

- [ ] One migration, named like the others in `main-server/prisma/migrations/` (`<YYYYMMDDHHMMSS>_add_quest_boards`), adds the enum `quest_board` and the columns `quests.board` and `quests.description` with their checks. Every stored Open or Approval Quest gets the board `hobby`, the most general of the four, before the check is added. The Prisma schema matches.
- [ ] Vitest tests at the API:
  - making a Quest with each Join Policy, with and without a board, and with a description too long;
  - each change of `PATCH` above: a board set and changed, a change to Open without a board, a board for a Closed Quest, a change to Closed clearing the board, a description cleared;
  - the board, the description and `createdAt` in each answer named above, and those of a Class Quest;
  - `?board=` alone, with `globalEventId`, and unknown.

  The test files share one database, so a test looks for its own Quests in a list.
- [ ] The main server's README, in Quests, records the board and the description: the values, the rule for Closed Quests, the two routes that set them with their refusals, the shapes with the new fields, and `?board=`.
- [ ] `GLOSSARY.md` gains **Board**: where an Open or Approval Quest is listed for recruiting, one of four kinds (식사, 진로, 취미, 공연). _Avoid_: category.
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/`.
