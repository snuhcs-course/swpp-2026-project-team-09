# 03: A session that fails only its place is still compared as the same event, and evaluation B measures it

Status: done

Parent: `../spec.md` (P12)

Branch and PR: its own branch from `3.0/Main` after the spec merges, merging the tag `p12-x` (X) once it exists and nothing newer (`3.0/P12-03-…`) and its own PR to `3.0/Main`, built in its own session at the same time as the other code tickets. The PR merges as soon as it is approved; ticket 06's after set measures its head at approval, before it takes in `3.0/Main` (spec, Measurement, changed plan). Heavy jobs take the shared lock (spec, Measurement).

**What to build:** The server reads each session's check results as three verdicts:

- `publishable`: every check passes;
- `comparable`: every check in an explicit list passes. The list is `announcesEvent`, `linesInPost`, `dateAgrees`, `weekdayAgrees`, `timeAgrees`, `notApplicationPeriod`, `startBeforeEnd`, `hasTimeOfDay` and `newSession`, so not `length`, `placeInLines` or `placeMatches`;
- `draftable`: `linesInPost`, and either the time checks or the place checks;
- `blockedBy`: the checks that failed.

The list for `comparable` is explicit, so a check added later, such as 04's `timesConsistent`, counts towards `publishable` only, without touching this list.

The publication step settles each session by its verdict:

- **publishable:** as today.
- **comparable only:** compared with the events that exist. It is never published. It is attached only on ADR 0014's terms:
  - the normalised titles and the starts are equal; or
  - the AI answers `same`, the starts are equal to the minute, and one normalised title contains the other.

  Otherwise it is held in the Same-event queue. The AI is given its place as written when it has no Place. The refusal rules apply as to any other session.
- **draftable only:** its read values fill its Draft.
- **none:** written only, as today.

Evaluation B's same-event step selects its sessions with the same verdict function instead of its own copy. The collection eval runner also saves the raw text of a Judgement that fails the schema, with the run's saved calls, and the production step logs nothing new; this is AB-2, the lowest-priority part, so do it last within the ticket. The glossary's **Judgement** entry is updated to say that a session that is not published may still be compared and attached. No new terms are added.

Spec: `../spec.md`, "AB-3: three verdicts" and "AB-2: raw failure text"; ADR 0014; ADR 0008 still holds for publication.

**Blocked by:** None (can start immediately).

## Target cases and expected result (written before implementing)

- Evaluation B: of the 25 true pairs lost before comparison in `464ea9c5`, the ones whose sessions fail only the place or length checks (up to 17, per the failure analysis) should now be compared. D2 and D3 should rise from 8/32, and D1 (wrong merges) should not rise. D4 may rise with more sessions held.
- `b-096` (outside Gwanak): it should be compared and attached or held, never published.
- Watch: a true pair refused as another time on the same day. Before, none was refused (D3 = D2); after, any such pair is listed in ticket 06's report.
- a-005 and b-082: if the schema failure happens again, the raw text should be saved. C4 is not expected to change.

## Acceptance criteria

- [x] A unit test tables the verdict function: each check failing alone, against the three verdicts. A check name outside the `comparable` list fails `publishable` only.
- [x] Publication-step integration tests with a scripted Judgement and same-event choice:
  - [x] A comparable-only session with equal normalised title and start attaches without the AI.
  - [x] AI `same` with an equal start to the minute and a contained title attaches.
  - [x] AI `same` with another minute is held in the Same-event queue, not attached.
  - [x] AI `same` with titles that do not contain one another is held.
  - [x] AI `different` or `unsure` is held, never published.
  - [x] Another time on the same day is refused without asking the AI.
  - [x] A comparable-only session with no candidate stays a Draft with its values filled and is not published.
  - [x] A draftable-only session fills its Draft.
  - [x] A publishable session settles exactly as before.
- [x] A session attached on these terms can be detached as today.
- [x] Evaluation B's step selects through the verdict function. Its unit tests cover a comparable-only session being compared.
- [x] A schema failure's raw text is saved with an eval run, and the production step's log output is unchanged. Both are tested.
- [x] The glossary's Judgement entry says what the new behaviour does, with no implementation detail.

## Comments

### Built (2026-11-05)

Branch `3.0/P12-03-session-verdicts`, from `3.0/Main` at `9942475b` (the P12 spec and ADR 0014). `p12-x` is not merged yet; it will be once it is tagged.

What was asked before building, and the owner's answers (`Jaehyun0320`, 2026-11-05):

- **What a draftable-only session fills.** Only the halves whose checks all pass. The time half is `dateAgrees`, `weekdayAgrees`, `timeAgrees`, `notApplicationPeriod`, `startBeforeEnd`, `hasTimeOfDay` and `length`, and it fills `startsAt` and `endsAt`. The place half is `placeInLines` and `placeMatches`, and it fills `place` with the Place's coordinates. The rest keep what the worker read. A session with no Draft to take gets a new one. A comparable-only session fills its time only. This was not done before: a failing session wrote nothing into its Draft.
- **A comparable-only session with no candidate** stays its own Draft, `heldFor` empty, with its time filled. It is not in the Same-event queue. Its Judgement session's `globalEventId` names that Draft.
- **Its hold when the terms are not met.** A new `SessionHold`, `place_unchecked` (a migration, and a label in the admin queue). It holds a comparable-only session that the AI answered `different`, or `same` without ADR 0014's terms. `unsure`, a failed call and several matches keep their existing holds.
- **How the two terms are stored.** Term (a): `attachedBy` `rule`, reason `equal_title_and_start_without_place`. Term (b): `attachedBy` `ai`, reason `same_minute_and_contained_title`. The AI's sentence stays in `same_event_answers.reason`.

Decisions made while building:

- **The verdict function** is `session-verdict.ts`. A check missing from a session's results counts as failed and is named in `blockedBy`. `publishable` means `blockedBy` is empty, so it equals the stored `passed`.
- **Placement.** Publishable sessions are placed exactly as before. A comparable or draftable session then takes, from the Drafts left:
  - its own Draft;
  - else the post's only Draft;
  - else a Draft with no start;
  - else a new Draft, whenever the last Draft left must stay for a session that settles nothing.

  A Draft that a session of the stored answer already fills is no longer offered. Without that, a later run over the Draft with `AUTOMATIC_PUBLICATION=off` would publish a passing session over the Draft a compared session fills. A test covers it.
- **The link rule** counts the Drafts that these sessions add, as it counts a passing session's new event. So a stored post can now have more sessions than before, and a post linking it can become `link_not_one_to_one`. Evaluation B counts them the same way.
- **Evaluation B.** A new post's sessions are chosen by `verdictOf`. A stored post's candidates are still only those that would be published, since in production a compared session's Draft is no candidate. Saved AI choices that do not cover a session now compared count as none. So replaying a B run saved before P12 with `--no-model` stops at that session, which is expected and not worked around.
- **AB-2.** `rawText` is saved with a stored Judgement in the eval run only when the answer fails the schema (`NoObjectGeneratedError.text`). It is an optional field, so earlier results still read. The production log still names only the error, and a test checks that no log line holds the model's text.
- `compared` moved from `session-settling.ts` to `session-comparison.ts` with the same behaviour, to stay within oxlint's file limit.
- Untouched, as asked: `judgement-time.ts`, `named-place.ts`, `post-sources.ts`, `judgement-model.ts`, the AI's instructions, the refusal rules, the chat code, and the sets, labels, thresholds and freeze tags of `eval/collection`.

Tests: the publication step with a scripted Judgement and choice is in `test/same-event-unplaced.integration.test.ts` (12 cases). It holds every criterion above, plus `AUTOMATIC_PUBLICATION=off`. The verdict table is in `test/session-verdict.unit.test.ts`, and placement in `test/judgement-placement.unit.test.ts`. What a Draft takes is in `test/judgement-draft-values.unit.test.ts`. Evaluation B is in `test/eval-collection-score-b-ai.unit.test.ts` and `test/eval-collection-run-unpublished.unit.test.ts`. The production log is checked in `test/judgement-failures.integration.test.ts`. The existing `same-event-*`, `publication-step` and `judgement-*` integration files pass unchanged, so detach, the pod races and the tries behave as before. Full `pnpm test`: main-server 232 files with 3,254 tests, and admin 20 files with 190 tests, all passed.

Reviewed on standards and on spec before the PR. The fixes are in `3ca31593`:

- a compared session had filled its place too;
- `blockedBy` left out a missing check;
- a few names were unclear.

No real model was run. The target cases are read in ticket 06.

### Review settled (2026-11-05)

`TaeHyun79` approved #213 at `1dc106e` with two notes, neither blocking. The owner (`Jaehyun0320`) decided both:

- **With `SAME_EVENT_AI_CHOICE=off`, Production's setting,** a comparable-only session that has candidates but no title match stays its own Draft, with its time filled. It is not queued and never published. This matches a publishable session with the AI off, which is published as its own. So the ticket's "otherwise it is held in the Same-event queue" holds only while the AI's choice is on.
- **Placement stays as it is for now.** On a post with one Draft, a passing session and a session that is only compared, the passing session gives up the Draft and becomes a new event, as before. The compared session takes the Draft, which then shows that session's time with the place the worker read for the passing one. Nothing is published that way. The fix is to free the Draft only when a failing session settles nothing. It changes where a publishable session goes, so it is left for a follow-up after ticket 06's after set.

The two code comments that no longer held (`placedSessions`, `compared`) and the README now say this.

### Agent usage (2026-11-05)

- Agent time: about 1 hour 40 minutes (estimate), one session with two review subagents. That includes the time integration tests ran under the shared lock, the PR, CI, and settling the review. It leaves out waiting for the owner.
- Tokens, the two subagents included: input 488, with 43,392,865 cache reads and 444,524 cache writes shown apart; output 142,986. Counted before the review fix was committed.
