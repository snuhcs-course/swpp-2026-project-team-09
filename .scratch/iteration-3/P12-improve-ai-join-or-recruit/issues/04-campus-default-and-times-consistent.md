# 04: Places without 서울대 are read on Gwanak, and a post with conflicting times stays a Draft

Status: ready-for-agent

Parent: `../spec.md` (P12)

Branch and PR: its own branch from `3.0/Main` after the spec merges, merging the tag `p12-x` (X) once it exists and nothing newer (`3.0/P12-04-…`) and its own PR to `3.0/Main`, built in its own session at the same time as the other code tickets. The PR merges only after ticket 06's after set is recorded. Heavy jobs take the shared lock (spec, Measurement).

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

- [x] Place-matcher unit tests:
  - [x] the three fixed cases above;
  - [x] each `ELSEWHERE` marker gives no Gwanak Place;
  - [x] `체육관 2층` → 71동;
  - [x] a unique name without 서울대 matches its Place;
  - [x] a Source with `campusDefault: null` keeps today's behaviour.
- [ ] `timesConsistent` unit tests:
  - [x] a different start on the same day fails;
  - [x] a different end fails;
  - [ ] a start-only line against a start–end line passes, and the end is taken;
  - [x] `오후 2시` against `14:00` passes;
  - [x] a time line with no date is ignored;
  - [x] a `[n회차]` line is compared only with session n.
- [x] A publication-step integration test with a scripted Judgement:
  - [x] a post with conflicting times stays a Draft and lists `timesConsistent` among its failed checks;
  - [x] a post at `문화관 로비` with consistent times is published at that Place.
- [x] Existing named-place and Judgement tests pass, or each changed expectation is explained in the PR.
- [x] The generic-name list and its sources are in the PR.

## Comments

### Decisions (2026-11-05)

- Built on `3.0/P12-04-campus-and-times`, from the tag `p12-x` with #211 (`6ba13b2c`) and #213 (`120f616b`) merged in.
  The fixed point for review is their merge, `c4258508`.
- `campusDefault` applies to Judgements only (`matchedPlace`). The rules' `namedPlace` call in `collected-posts.service.ts`
  is unchanged, as `buildingNumberIsGwanak` was Judgement-only.
- `GENERIC_PLACE_NAMES` is a list of Places' names that other institutions use too. A generic name after another
  facility's name is never matched, 서울대 or not. Where the campus is only assumed (no 서울대 in the place), every
  Place name is matched only alone, with a floor or a room at most (호, 층, 강당, 강의실, 세미나실, 회의실, 로비). Every name is a Place's name from
  `labels/places.tsv`; those also seen in a development post's place line are marked:
  체육관 (71; `금나래문화체육센터 2층 체육관`, extra-PGM012002305, snu-177311), 학생회관 (63; `학생회관 5층 대학생활문화원`,
  extra-PGM012002142), 행정대학원 (57; snu-177656), 국제대학원 (140; snu-177824), 보건대학원 (221; snu-178028),
  생활과학대학 (222; extra-PGM012002378), and from the list of Places alone 미술관 (151), 박물관 (70), 교수회관 (65),
  행정관 (60), 복지관 (75), 학군단 (66), 언어교육원 (137), 종합운동장, 야구장, 테니스장, 게스트하우스 (125-2), 컨벤션센타
  (125-1), 주차건물 (76-1), 환경대학원 (82), 수의과대학 (85), 농업생명과학대학 (200) and SK텔레콤 (943, a company with
  offices elsewhere). 도서관 is in no Place's name alone, so it needs no entry. The development posts are those of a
  `development` entry of `set-a.yaml` or `set-b.yaml` and of no `held-out` one (53 posts).
- `timesConsistent` reads each line's times with 01's reader (`writtenTimes`, built on its `CLOCK`, `DAY`, `hoursOf`
  and list-number handling). It skips a line labelled an application period. A session's `[n회차]` number is that of the post line its
  start is quoted from, else its place in the answer. A line of sittings each written from start to end passes when
  one of them is the session's. An unnumbered line of the session's day is compared with every session, so two sessions on
  one day on separate unnumbered lines fail each other: a C1 loss, not a C2 one.
- "The session's end is then taken from the line that has one" is met as "does not fail": the check does not rewrite
  the session's end, which would mean changing the settle flow this ticket leaves alone. That box is left unticked.
- **A departure from the spec, made after reading held-out results.** The first replay published a-015 session 2 and
  a-053 at the time of extra.snu's `[n회차]` line, while the body wrote the day on one line (`일시: …`) and another
  time on the next (`시간: …`), which "lines with a time and no date are ignored" let through. So a time field
  (`시간:`, or 진행, 행사, 강의, 교육, 수업, 활동 or 운영 before 시간) under a line of a day alone is read as one line with it.
  Joining any time-only line also failed a-075's correct sessions, whose running order sits under day headers, so it
  was narrowed to time fields. The full suite then showed that a line of two sittings on one day failed the second,
  which led to the "one of them" rule above. These rules were shaped by held-out cases; the numbers below are a
  development reading.
- Changed expectations: four unit rows and one integration test whose session gives a time the line does not write now
  fail `timesConsistent` too (`judgement-checks`, `judgement-checks-time-reading`, `same-event-unplaced`). The helper of
  `session-verdict.unit.test.ts` drops the name it added by hand, now in `JUDGEMENT_CHECKS`; its row "a check outside
  the list only stops publication" still passes with `timesConsistent`.
- The admin lists checks by the name the server gives (`judgement-panel.tsx`), with no table of names to extend.

### Owner's decisions (2026-11-05)

Jaehyun0320 decided these, after the replay and #215's first review:

- **Day and time on two lines.** Fix the rule, since a wrong publication is the worse failure. A time field under a
  line of a day alone is read as one line with it. This departs from "Lines with a time but no date … are not
  compared" (spec, AB-4).
- **Place, with the campus assumed.** Every Place name, not only a generic one, must stand alone, with a floor or a
  room at most. This closes `고려대 문화관 2층`, `OO구 문화관`, `OO시 문화관` and `OO재단 문화관 강당`. Adding markers to
  `ELSEWHERE` was the alternative.
- **Several times on a line.** One of a line's times may be the session's only when each of them is written from a
  start to an end (`14:00~16:00, 17:00~18:00`). A line with a start alone, such as a change notice
  (`15:00 → 16:00으로 변경`), must agree in each, as the spec has it.
- **Application lines.** Only an application word before a line's first number, or a short label above it, makes
  `timesConsistent` skip the line. `(사전 예약제)` after the day does not.
- **"The session's end is then taken from the line that has one"** is dropped from this ticket. The check does not
  fail on a start-only line, but it does not fill the end, which would change the settle flow. Its acceptance box is
  left unticked for this reason.

After these, the replay at `0952e036` gives the same numbers as `9085a01c` below, with nothing moved; a-017 stays a
Draft failing `placeMatches` and `timesConsistent`.

### Replay (2026-11-05)

`pnpm eval:collection --run judgement --part held-out --from eval/results/collection-held-out-judgement-464ea9c5.json
--no-model`, on a clean tree. A development reading of the held-out set. The result files are not committed.

| | 01 alone (`57e1ad3a`) | 01+03 (`c4258508`) | 01+03+04 first (`0543bc2d`) | 01+03+04 (`9085a01c`, `0952e036`) |
| --- | --- | --- | --- | --- |
| C1 published without an Administrator | 35/64 | 35/64 | 40/64 | 40/64 |
| C2 wrong publications | 0/35 | 0/35 | 2/42 | 0/40 |
| C3 wrong places (published sessions) | 0 | 0 | 0 | 0 |
| C3 diagnostic (sessions failing a check too) | 0 | 0 | 0 | 0 |

03 left publication as 01 had it. Against the first version, a-015 session 2 and a-053 now stay Drafts failing
`timesConsistent`; nothing else moved.

### Agent usage (2026-11-05)

- Agent time: about 1 hour 30 minutes over one session, an estimate that leaves out the waits for the owner.
- Tokens, the session and its two review subagents together: input 298, output 115,784; of the input, cache reads
  19,633,543 and cache writes 350,730.

