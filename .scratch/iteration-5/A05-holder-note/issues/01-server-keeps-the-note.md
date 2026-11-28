# 01: The main server keeps a Holder's 한마디 and gives it to the 파티's members

Parent: [A05 spec](../spec.md)
Status: needs-triage
Owner: TaeHyun79
Blocked by: None.

Native files: none. Database: one migration (nullable `note` and `noted_at` on `quest_holders`). Releases: a main server Release, before the app's update (spec, "The migration's limits, and the Release").

One pull request with 02 and 03, a commit for each ticket. This is its first commit.

## What happens now

Positions are as of `origin/5.0/Main` 99dd46786.

- A Holder's row (`main-server/prisma/schema.prisma:654`) keeps when they entered and the minutes they reported being late. Nothing a Holder says is stored. The row is deleted when the Holder leaves or is removed and when the Quest ends.
- A member in a Quest's reply is `{ user, state, lateMinutes }` (`main-server/src/quests/dto/quest.dto.ts:64`), built in `toQuestDto` (`:277`), which `QuestsService.list` and `read` alone call, both for a Holder. What others read, the list of recruiting Quests, an invitation and a request to join, has no members.
- `inQuest` (`main-server/src/quests/quests.service.ts:341`) locks the Quest, checks that the User holds it and makes a change. A User who does not hold it gets `404 QUEST_NOT_FOUND`, and a Class Quest `409 CLASS_QUEST` (`holderIn`, `:306`).
- A request's line keeps up to 2 KB of both bodies. The log masks a field by its name (`SECRET_NAME`, `main-server/src/common/log-body.ts:11`) and writes every other value as sent, a Quest's members among them.
- The late report is the precedent: its migration (`20261114231804_add_quest_late_minutes_and_declines`), its service (`main-server/src/plans/late.service.ts:33`) and its signal.

## What to build

- **The migration.** `quest_holders` gains `note` and `noted_at`, both nullable, with a check that both are set or both empty and that the words are 1 to 40 characters. No default and no backfill. The schema and the migration are committed together.
- **`PUT /quests/:questId/note`**, body `{ "holderNote": "<words>" }`, answering 204. It writes, replaces or, with the empty text, clears the caller's own.
  - The words are trimmed and a line break or a run of spaces becomes one space. What is left is at most 40 characters, counted as Unicode numbers them, else 400.
  - Only a Holder: `404 QUEST_NOT_FOUND` otherwise, `409 CLASS_QUEST` for a Class Quest and `409 QUEST_TAKEN_ALONE` for a Quest taken alone, the refusals there are. It asks neither whether the Quest has ended nor whether its Party runs.
  - The same words as are stored change nothing: the time stays and no signal is sent. So a repeat is safe and takes no Idempotency-Key. Nothing limits how often it is called.
  - After a change every Holder gets `quests-changed`.
- **The replies.** A member gains `holderNote`, `{ text, notedAt }` or null: null for a Holder without one, for the invited and for the declined.
- **The log.** `holderNote` joins the masked names, which covers this request and every reply that carries a Quest.
- **The main server's README**: Quests (the route, its refusals, the field, the columns) and Logging (the masked name).

## Must not break

- The replies of a Quest for an app that does not know the field; the list of recruiting Quests, invitations and requests to join, which carry no members.
- The old server's pods while a Release replaces them: both columns are nullable.
- `lateMinutes` and a member's state.
- The request lines of other routes: their other values are written as before.
- Tests: `quest-members`, `quest-declines`, `quest-late`, `quests`, `own-quests` (`.integration`), `log-body` (`.unit`), `request-logging` (`.integration`). Those that compare a member exactly gain `holderNote: null`.

## Acceptance criteria

- [ ] A Holder's words are in the Quest's and the list's replies to another Holder with their time, replaced by a second write and gone after the empty text. (Main server integration test, which fails before the change.)
- [ ] The same words again leave the time as it was and send no signal; a change sends `quests-changed` to every Holder. (Same test file.)
- [ ] Words with line breaks and spaces around are kept as one trimmed line; 40 characters are taken, emoji counted as one each, and 41 refused with 400. (Same.)
- [ ] An invited User and a stranger get 404, a Class Quest and a Quest taken alone 409. (Same.)
- [ ] They are gone after the Holder leaves, is removed, and joins again; the list of recruiting Quests, an invitation and a request to join do not hold them. (Same.)
- [ ] A body with `holderNote`, in a request or deep in a reply, is logged with the value masked. (The log body's unit test.)
- [ ] The migration runs on a database with rows; no native file changes; lint, format and types pass.

## Comments
