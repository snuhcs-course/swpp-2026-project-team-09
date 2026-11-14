# 07: A registration that did not go through is tried again when the app comes to the front

Parent: [spec](../spec.md) ("The app: registration and the permission")
Status: done
Blocked by: None
Native files: no

## What to build

The phone registered its token at a start, at a sign-in, and when its token changed. A registration that failed or was cut short, for example right after the User allowed notifications on a slow phone, waited for the next start, and so did notifications allowed later in the phone's settings. Until then no push reached the phone. `getExpoPushTokenAsync` can fail offline or on a timeout, and Expo's own comment on it advises trying again later.

While the Session is ready and no registration has gone through in this run of the app, the app tries again each time it comes back to the front. Once one went through, coming to the front sends nothing more.

## Acceptance criteria

- [x] A registration the main server refused at a start is sent again when the app comes to the front, and not again after that once it went through.
- [x] With notifications allowed in the phone's settings while the app was in the background, coming to the front registers the token, and no prompt is shown.
- [x] The changed source and test files have their AI-generated rows; lint, format, and type checks pass, and so do the touched tests; no native file changes.

## Comments

### Checked on the emulator (2026-11-15)

On a debug build of the iteration's Main and a local stack, a push the main server sent through Expo for an invitation arrived on the emulator while the app was in the background ("<Leader>님의 파티 초대", body the Quest's title, channel `default`), the tap opened 파티 › 초대 with the invitation, and both Expo receipts were `ok`. Right after Allow, no registration reached the main server within 90 seconds; the app registered after a restart. Repeated on a cleared app, `/push-check` read the permission and got a first token about five seconds after Android's prompt closed, so the slow emulator of that moment is the likely cause. This ticket covers such a case either way.

### Agent usage (2026-11-15)

The check on the emulator, the check of its one open point, and this ticket: the session that reviewed tickets 01 to 04, with one Opus 5.5 subagent that ran the check on the emulator.

- Agent time: about 173 minutes, an estimate from the transcripts' timestamps (the session's and the subagent's active stretches together, gaps of five minutes or more left out). The Gradle build of the check took 66 of them.
- Tokens: output 171,736; input 103,304,831, of which 101,718,717 were cache reads, 1,585,478 cache writes, and 636 uncached. Without cache reads: 1,757,850.
