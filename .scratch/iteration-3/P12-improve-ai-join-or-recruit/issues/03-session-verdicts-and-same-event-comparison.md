# 03: A session that fails only its place is still compared as the same event, and evaluation B measures it

Status: ready-for-agent

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

- [ ] A unit test tables the verdict function: each check failing alone, against the three verdicts. A check name outside the `comparable` list fails `publishable` only.
- [ ] Publication-step integration tests with a scripted Judgement and same-event choice:
  - [ ] A comparable-only session with equal normalised title and start attaches without the AI.
  - [ ] AI `same` with an equal start to the minute and a contained title attaches.
  - [ ] AI `same` with another minute is held in the Same-event queue, not attached.
  - [ ] AI `same` with titles that do not contain one another is held.
  - [ ] AI `different` or `unsure` is held, never published.
  - [ ] Another time on the same day is refused without asking the AI.
  - [ ] A comparable-only session with no candidate stays a Draft with its values filled and is not published.
  - [ ] A draftable-only session fills its Draft.
  - [ ] A publishable session settles exactly as before.
- [ ] A session attached on these terms can be detached as today.
- [ ] Evaluation B's step selects through the verdict function. Its unit tests cover a comparable-only session being compared.
- [ ] A schema failure's raw text is saved with an eval run, and the production step's log output is unchanged. Both are tested.
- [ ] The glossary's Judgement entry says what the new behaviour does, with no implementation detail.
