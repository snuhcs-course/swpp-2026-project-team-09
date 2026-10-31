# 03: The P4 eval set, frozen before any result

Parent: [P04 spec](../spec.md) ("Evaluation plan" 1)
Status: ready-for-agent
Blocked by: None

## What to build

A frozen evaluation of the Assistant for both scenarios: 40 cases beside P19's, in the existing harness, with their own world, a frozen travel fixture, a rules document, reviewed labels and thresholds. It lands before the implementation, so that a late implementation does not push the freeze and the labels do not follow the code.

The labels are drafted by an agent that never sees the judgement code, and a person reviews them. The fixed P19 cases run 3 times on the code before the chat changes, so that ticket 05 can show the chat did not get worse.

Tickets 04 and 05 wait only for the world, the fixture and the labels. Once those are committed they can start, with the person's review and the baseline run still open. The baseline stays on the commit just before the chat's prompt and tools change, whenever it runs.

Everything here except the baseline run is committed by the P8 freeze, 11-01. Running the P4 suite itself is in ticket 05.

An item marked **Person** is a person's work, not an agent's.

## Acceptance criteria

- [ ] **The reply-text fix** (`3.0/fix-reply-text-across-steps`) is on `3.0/Main` before the baseline run. The required reply content needs it, since the model often writes its answer beside a tool call.
- [ ] **Harness changes.**
  - A `now` per case, and a default clock for the P4 suite.
  - The `world` field, the way P05 ticket 02b defines it, by whichever of P4 and P05 comes first.
  - The `restaurant` card kind, in `expect.cards` and in a fixed history's Assistant turns.
  - `text.absent`: words the reply must not hold, such as the names of Friends who are not free.
  - Normalisers for `getMyDay`, `findFreeTimeEvents`, `findFreeFriends`, `findMealRestaurants` and `showRestaurants`.
  - The pinned counts become a check that the fixed set is included, once, by whichever of P4 and P05 comes first.
- [ ] **The P4 suite.**
  - It lives in its own case directory, and its cases name the P4 world.
  - P4 does not change the existing cases or their world.
  - It has 40 cases: 공강 파티 15, 공강에 밥 15, 공통 10.
  - 공통 holds asking back, refusals, no Timetable, off-campus or no-Place items, and tool choice.
- [ ] **What a case checks,** with P19's assertion kinds and `text.absent`:
  - the action;
  - the tools called and their arguments (date, the two Classes, Board, Friends, meal);
  - asking back when the request is ambiguous or a tool returns `needs`;
  - exactly the cards the tools returned, none added or dropped, and no busy Friend named;
  - the fields of a Proposal from `proposeQuest`, but not the Restaurant card's Proposal, which only integration tests check;
  - the reply's required content through `text.mentions`.
  - Tool choice shows in the tools: a case that needs a new tool requires it, and one that must not use it forbids it.
- [ ] **Required cases.**
  - One gap where at least 21 candidates fit.
  - One follow-up turn that narrows it.
  - One "여기로 하자" turn after Restaurant cards.
  - Both sides of each tool-choice rule for meals and clock times, among the 공통 cases.
  - The follow-ups are fixed-history cases.
- [ ] **The world** holds:
  - the User with a Timetable on at least 3 weekdays, gaps before the first and after the last Class, one off-campus item and one Class without a Place;
  - at least 5 Friends: one without a Timetable, one with no Classes that day, one with an off-campus item, and two with the same name in different departments;
  - a Quest for each exclusion, so that the checks confirm none appears;
  - a Sub Quest without an end, and Quests whose place is a label only or a point only;
  - Global Events with an end, without one, and longer than 3 hours;
  - lunch and dinner menus: a noodle-only Restaurant, a mixed one, a closed cell (notes only), an open Restaurant that does not fit the shared time, and a Restaurant without a Place.
- [ ] **The travel fixture** is a frozen file giving, for every ordered pair of Places the world uses, the seconds and the mode. It does not depend on the time of day. The labels do not change when the real table or the shuttle file changes.
- [ ] **The rules document** states the judgement in prose, with every number of the spec's constants table, and is committed with the suite.
- [ ] **PM decisions (2026-10-31).** The spec disagrees with itself on three points and leaves a fourth open. The PM settled them, and the rules document states the answers. The spec is not changed; where it disagrees, these answers hold.
  - A window named for a meal. A single clock time ("1시에") goes to `proposeQuest`. A time window ("12시에서 1시 사이") goes to `findMealRestaurants` with that window.
  - A Friend's Travel Time. The card shows the time "Travel shown per person" picks when it is known, and "—" only when it is unknown. So a Friend whose previous item has a Place and whose next item does not shows the in-time.
  - A Quest card's time. The presenters do not change, so a Quest card still shows the existing next Sub Quest. Cards are ordered by the start of the Sub Quest judged inside the gap. With several Sub Quests the card's time can differ from the judged one, which is a known limitation.
  - A Sub Quest's Place. A Sub Quest can hold a point or a label and no Place. Ticket 04's mapping of a candidate's place applies to the User's and Friends' Sub Quests too, and only a Sub Quest it cannot map is an item without a Place. A Class's Place is used as it is.
- [ ] **Label draft.** An agent in a separate session, which sees only the rules document, the world and the fixture and not the judgement code, drafts each case's answer with its working.
- [ ] **Person: label review.** A person reviews every answer and sets the labels that need a judgement of meaning:
  - which dishes are noodles;
  - "운동만": the tool call uses Board 취미, and the expected cards are the hobby Quests and the Global Events whose titles are sports, so board games drop out.
- [ ] **Person: the TA.** The meaning labels are discussed with the TA, as the course asks.
- [ ] The suite records who drafted and who reviewed the labels.
- [ ] **Score, committed before any run.**
  - A case passes when all its assertions hold.
  - Thresholds: overall ≥ 80% and each category ≥ 70%.
  - The suite runs 3 times and takes the mean, recording the model, the limits, the commit and the date.
- [ ] **Test.** The case schema test in CI also loads the P4 suite. It checks the new fields and that every seed name exists, as it does for P19.
- [ ] **Person: the cost.** A person confirms the cost before the baseline run.
- [ ] **Baseline.** Every case of the fixed P19 set runs 3 times at the commit just before the chat's prompt and tools change, and the runs are saved with the model and the limits.
