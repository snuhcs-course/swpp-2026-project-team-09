# 04: Places without 서울대 are read on Gwanak, and a post with conflicting times stays a Draft

Status: ready-for-agent

Parent: `../spec.md` (P12)

Branch and PR: its own branch from `3.0/Main` after the spec merges, merging the tag `p12-x` (X) once it exists and nothing newer (`3.0/P12-04-…`) and its own PR to `3.0/Main`, built in its own session at the same time as the other code tickets. The PR merges as soon as it is approved; ticket 06's after set measures its head at approval, before it takes in `3.0/Main` (spec, Measurement, changed plan). Heavy jobs take the shared lock (spec, Measurement).

**What to build:** Two changes that land together in one PR. The wider campus default without the time check would publish wrong times (a-015, a-053). They may be split into commits, but not into PRs.

**Campus default.**

- The Source setting `buildingNumberIsGwanak` becomes `campusDefault: 'gwanak' | null`. Both SNU Now and extra.snu are `'gwanak'`.
- On such a Source, a place with no `ELSEWHERE` marker is matched as on Gwanak, as if it carried 서울대학교. The markers include 연건, 시흥, 서울대(학교)병원, 의과대학, another university, another district or province, and 아파트.
- `GENERIC_PLACE_NAMES` lists common facility names (체육관, 미술관, 도서관 and others), drawn from the place lines of the development posts and from the list of Places, never from held-out posts. The PR lists where each came from.
  - A generic name preceded on its line by another facility's name is not matched.
  - A generic name alone, with a floor or a room at most, is matched to its campus building.

**`timesConsistent`.** A new Judgement check, listed by the admin under its own name like the others:

- It compares the session with every line of the post that writes both a date and a time. Lines with a time and no date, such as a running order, are ignored.
- A worker line numbered for a session (`[n회차] 기간: …`) is compared only with that session.
- It fails when a line for the session's day gives another start or another end.
- It does not fail when one line gives only a start and another a start and an end; the session's end is then taken from the line that has one.
- It does not fail when only the writing differs (`오후 2시` against `14:00`).
- It counts towards publication only. It is not in 03's `comparable` list, and needs no change there.

No notice to Administrators is built.

Spec: `../spec.md`, "AB-4: campus default and time consistency"; ADR 0008.

**Blocked by:** None (can start immediately). `comparable` is an explicit list in 03, and today's `passed` is every check, so the new check means "publishable only" with or without 03.

**Merge 주의:** 01 changes the same time reader and text normaliser. Whichever lands second merges the other in, and its tests for list-number lines must still pass after the merge.

## Target cases and expected result (written before implementing)

- Fixed first, as unit tests that must pass before the default is widened:
  - `구로구민체육센터 2층 체육관` → no Place;
  - `체육관` → 71동;
  - `301동 2층 세미나실` → 301동.

  They write the patterns in new words; no held-out post's place line goes into a test.
- Held-out sessions failing only on a place without 서울대 (a unique building or spot name with no 서울대) should become published. C1 is expected to rise towards 40/64 together with 01, as a development reading (spec, Measurement).
- Measured also by replaying the saved Judgements with 01 and 04 together, at no model cost, and recorded beside 01's replay.
- a-053 (table 17:00, body 19:00), a-015 session 2 (22:00 and 21:00) and a-017 (19:00 and 18:20) should stay Drafts, failing `timesConsistent`.
- C2 and C3 must stay 0. Any session published at a wrong time or place after this ticket is a failure of the ticket, not of the bundle.

## Acceptance criteria

- [ ] Place-matcher unit tests:
  - [ ] the three fixed cases above;
  - [ ] each `ELSEWHERE` marker gives no Gwanak Place;
  - [ ] `체육관 2층` → 71동;
  - [ ] a unique name without 서울대 matches its Place;
  - [ ] a Source with `campusDefault: null` keeps today's behaviour.
- [ ] `timesConsistent` unit tests:
  - [ ] a different start on the same day fails;
  - [ ] a different end fails;
  - [ ] a start-only line against a start–end line passes, and the end is taken;
  - [ ] `오후 2시` against `14:00` passes;
  - [ ] a time line with no date is ignored;
  - [ ] a `[n회차]` line is compared only with session n.
- [ ] A publication-step integration test with a scripted Judgement:
  - [ ] a post with conflicting times stays a Draft and lists `timesConsistent` among its failed checks;
  - [ ] a post at `문화관 로비` with consistent times is published at that Place.
- [ ] Existing named-place and Judgement tests pass, or each changed expectation is explained in the PR.
- [ ] The generic-name list and its sources are in the PR.
