# 03: A Quest carries its members, and an answer to an invitation is signalled

Parent: [P03 spec](../spec.md) ("Members and the signals of an answer", "The app")
Status: ready-for-agent
Blocked by: none

## What to build

A Quest, as a Holder reads it, lists its members with the state of each: accepted for a Holder, invited for a User whose invitation waits. When an invited User accepts or declines, the Leader's app is told at once with a signal that names the Quest and the User. The app passes a signal's payload on, fetches the Quests again, and lets a screen listen for the two signals.

## Acceptance criteria

- [x] A Quest a Holder reads carries `members`: the Holders in the order they entered as `accepted`, then the Users whose invitation waits as `invited`, by when it was sent. A Class Quest has none.
- [x] The contract declares all four states (`invited`, `accepted`, `late`, `declined`) and `lateMinutes`; `late` and `declined` are sent once the schema holds them.
- [x] Accepting sends the Leader `invitation-accepted` with `{ questId, userId }`, beside today's `quests-changed`. No other User receives it.
- [x] Declining sends the Leader `invitation-declined` with `{ questId, userId }`, and `quests-changed` to the invitee and to every Holder.
- [x] The app's live connection passes a signal's payload on. `invitation-accepted` and `invitation-declined` fetch the Quests and the sent invitations again, and a listener receives the Quest and the User each names.
- [x] The app takes a Quest with or without `members`.
- [x] Integration tests on the server: the members after an invitation, an acceptance, and a decline; the two signals and who receives them; a Class Quest. Tests in the app: a payload passed on, the two signals fetching again and reaching a listener, and a Quest with and without members passing the check.

## Comments

### Decisions (2026-11-14)

- A Quest's `members` is read with every `QuestDto`, the Leader's and every other Holder's alike, from the Quest's waiting invitations: who has been invited is no secret among the Holders, and the spec gives every Holder the same chips.
- Every member carries `lateMinutes`, `null` until the schema holds a Holder's late minutes; the app's check refuses a member without it.
- The app's `members` is optional, so a reply from a main server before this change and every existing fixture still pass; a `members` that is present must be a list of valid members.
- The Leader's id for `invitation-accepted` is read in the acceptance's transaction after the entry; the decline reads the Holders before it deletes the invitation, so a Holder who leaves at that moment may get one `quests-changed` too many, which only fetches again.
- The two signals refetch only `QUESTS_KEY` and `SENT_INVITATIONS_KEY`: `quests-changed`, sent beside them, already refetches the rest.
- `tellInvitationAnswer(name, payload)` in `mobile/src/live/invitation-answers.ts` is the one function live updates calls; it ignores any other signal and a payload without both ids as texts. The listeners live in that module, not in a React context, so a screen subscribes with `onInvitationAnswer` in an effect and unsubscribes with the function it returns.
- The app's check of a Quest moved, unchanged but for `members`, from `mobile/src/api/server/answers.ts` to a new `quest-answers.ts` beside it: `answers.ts` was at the lint's limit of 300 lines.
- The app's integration test checks the refetch of `GET /quests` and the listener; the main screen it starts shows no sent invitations, so the refetch of `SENT_INVITATIONS_KEY` is read from the `REFETCH` table, not observed.
- The `socket-server/README.md` rows keep the table's width, so that no other row of the table changes.
