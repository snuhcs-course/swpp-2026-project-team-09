# 16: Recruiting boards, the Quest's description, and the Leader's endings

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A Quest that gathers people in public is posted on a board, as the wireframe's 파티 tab draws it: `식사 게시판`, `진로 게시판`, `취미 게시판` and `공연 게시판`. Every Quest can carry a description, the text of its recruiting post (the frames' `본문`). The Leader sets both when making the Quest and changes them later. The list of recruiting Quests can be narrowed to one board, and every answer that holds a Quest says its board, its description and when it was made, so that the app shows a board's posts newest first and marks the posts of today.

The Leader also sees and ends what they started. A Leader lists the invitations sent into the Quest and cancels one, ends the Quest for every Holder at once, and ends the Party for every member at once, where today a Quest ends only when its last Holder drops it and a Party only when its last member leaves. The list of Parties a User can see says who leads each.

P13's board screens and its 파티 만들기 form build on this ticket, and so do the 파티 room's `초대 중`, `파티 없애기`, `활성화 끄기` and the waiting state of 활성화.

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

### The Leader's invitations

- [ ] `GET /quests/:questId/invitations`, the Leader's, answers the Quest's waiting invitations with who was invited, the newest first: `[{ "id", "user": { "id", "name", "department" }, "sentAt" }]`, as the Leader's list of requests to join reads.
- [ ] `DELETE /quests/:questId/invitations/:id`, the Leader's, cancels a waiting invitation and answers 204. An invitation that is not waiting in this Quest, a repeat included, is refused with 404 `QUEST_INVITATION_NOT_FOUND`, so it takes no `Idempotency-Key`.
- [ ] Both lock the Quest and check the Leader once it is locked, as every Leader's control does: 403 `NOT_QUEST_LEADER` for another Holder, 404 `QUEST_NOT_FOUND` for a User who does not hold the Quest, and 409 `CLASS_QUEST` for a Class Quest of the User's.
- [ ] An acceptance and a cancel of the same invitation at the same moment leave either a Holder or a cancelled invitation, never both: accepting checks again, once the Quest is locked, that the invitation still waits, and is refused with `QUEST_INVITATION_NOT_FOUND` otherwise.
- [ ] `quests-changed` goes to the invited User when the invitation is cancelled, as when it was sent, and now also to the Leader when the invited User declines, so that the Leader's list drops it. An accepted invitation already reaches the Leader, a Holder.

### Ending a Quest

- [ ] `POST /quests/:questId/end`, the Leader's, ends the Quest for every Holder and answers 204: the Quest is deleted with its Sub Quests, the Holders' progress, its requests to join and its invitations, as when its last Holder drops it. `DELETE /quests/:questId` stays one Holder's drop.
- [ ] A running Party for the Quest goes on tied to no Quest, as today when the last Holder drops it: its `quest` reads `null`. No Party changes otherwise.
- [ ] It locks the Quest and checks the Leader once it is locked: 403 `NOT_QUEST_LEADER` for another Holder, 404 `QUEST_NOT_FOUND` for a User who does not hold the Quest and for a repeat, so it takes no `Idempotency-Key`, and 409 `CLASS_QUEST` for a Class Quest of the User's. An entry, an answer to a request or an invitation, or another Leader's control at the same moment runs after it and is refused as for a Quest that is gone.
- [ ] `quests-changed` goes to every Holder, the Leader included, and to every User whose request to join or invitation was waiting, all read before the Quest is deleted.

### Ending a Party

- [ ] `POST /parties/mine/end`, the Leader's, ends the Party for every member and answers 204: every member is taken out, and the Party is deleted with its requests and invitations, as when its last member leaves. Every Quest stays as it is.
- [ ] It locks the Party and checks the Leader once it is locked: 404 `NOT_IN_PARTY` for a User in no Party, a repeat included, so it takes no `Idempotency-Key`, and 403 `NOT_PARTY_LEADER` for another member. A User entering or leaving at the same moment runs before or after it; after it, entering gets `PARTY_NOT_FOUND` and leaving `NOT_IN_PARTY`.
- [ ] The positions stop as leaving stops them: `position-removed` goes at once to and about each member, for every sight the end takes away (`VisibilityService.announceRemovals` around the members).
- [ ] `party-changed` goes to the Party's audience as it was before the end: the members, the Holders of its Quest and the Friends of its members.

### Who leads a Party

- [ ] Each entry of `GET /parties` gains `leader: { "id", "name" }`, the Party's Leader now, who is its opener until the role passes. The Party inside `GET /party-join-requests` and `GET /party-invitations`, which reads as the list shows it, gains it too.

### Existing rows, records and checks

- [ ] One migration, named like the others in `main-server/prisma/migrations/` (`<YYYYMMDDHHMMSS>_add_quest_boards`), adds the enum `quest_board` and the columns `quests.board` and `quests.description` with their checks. Every stored Open or Approval Quest gets the board `hobby`, the most general of the four, before the check is added. The Prisma schema matches.
- [ ] Vitest tests at the API:
  - making a Quest with each Join Policy, with and without a board, and with a description too long;
  - each change of `PATCH` above: a board set and changed, a change to Open without a board, a board for a Closed Quest, a change to Closed clearing the board, a description cleared;
  - the board, the description and `createdAt` in each answer named above, and those of a Class Quest;
  - `?board=` alone, with `globalEventId`, and unknown;
  - the Leader's list of invitations, its order and shape, an invitation cancelled and the invited User told, a decline reaching the Leader, a cancel of an invitation no longer waiting, and an acceptance and a cancel at the same moment;
  - ending a Quest: its Sub Quests, requests and invitations gone, a running Party going on with `quest: null`, the signal to the Holders and to the Users who waited, a repeat, and the refusals for another Holder, a non-Holder and a Class Quest;
  - ending a Party: every member out, its requests and invitations gone, the Quests unchanged, `position-removed` between members who saw each other, `party-changed` to the audience, a repeat, and another member refused;
  - `leader` in the entries of `GET /parties` and in the Party of a request and an invitation, after the role was handed over too.

  The test files share one database, so a test looks for its own Quests in a list.
- [ ] The main server's README, in Quests, records the board and the description: the values, the rule for Closed Quests, the two routes that set them with their refusals, the shapes with the new fields, and `?board=`. It records too:
  - in Quests, the Leader's list of invitations and its cancel beside the other routes of invitations, ending a Quest among the Leader's controls, the routes that refuse a Class Quest with these three added, and who hears `quests-changed` now;
  - in Party, ending the Party among the Leader's controls, `party-changed` and `position-removed` for it, and `leader` in the list's entry.
- [ ] `GLOSSARY.md` gains **Board**: where an Open or Approval Quest is listed for recruiting, one of four kinds (식사, 진로, 취미, 공연). _Avoid_: category.
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/`.
