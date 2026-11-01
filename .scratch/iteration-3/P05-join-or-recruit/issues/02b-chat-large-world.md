# 02b: Chat metrics: the large world

**What to build:** A second eval world with hundreds of Quests and Global Events, generated with their answers known, so that finding every matching Quest is measured at a realistic scale, both for the server alone in CI and for the real model. It is test data only: each run seeds it into a fresh database container, and it never reaches the Dev Server or Production. Spec: `../spec-chat.md`, "The P05 eval suite"; metrics: `../references/iter3-p5 메트릭.md` evaluation D.

**Blocked by:** 02. Its cases, tags and thresholds are committed, as the large world's C0, before ticket 10 starts.

**Status:** ready-for-agent

- [x] A generator makes about 1,000 Quests and a few hundred Global Events from attributes (activity, time, Place, capacity, Holders, started or not, Board) with a fixed random seed.
- [x] Titles vary by a list of wordings per activity (synonyms, typos) that a person wrote or checked; wordings made by a model are checked on a sample, and the sample is recorded.
- [x] Hand-made traps are added on top: look-alike words ("배민"), 대면 against 비대면, times at a window's edge.
- [x] Each case's expected cards are computed from the attributes, not labelled by hand, once, and stored with the case; a run never computes them again, so that a later change to the matching rules cannot change the answers. No case expects more than 20 cards, the most a reply shows.
- [x] The generated Quests and Global Events are committed as a data file under a versioned name (`large-world-v1`); a run reads only that file and never runs the generator, which is used only to make a new version.
- [x] Seeding reads the data file through its own loader, so that a schema change is met by changing the loader, never the data file.
- [x] Any change to the world's data or answers makes a new version; scores from different versions are never put side by side.
- [x] Scoring compares the set of cards shown with the expected set through one step that turns the Assistant's reply into card ids, so that a later change in how replies show cards needs only that step changed.
- [x] A case names the world it runs in; the small world's cases are unchanged.
- [x] Subset V (more matches in a window than fit in one result, answers late in the day) runs here, with cases for the other subsets at scale. E3 and E4 are reported per world.
- [x] Subset tags and thresholds for the large world's cases are committed with them.
- [x] A test in CI, with no model, calls the search tools with each case's intended inputs and checks that the server's result holds every expected card (server recall). Until ticket 10 lands, the cases that need its inputs are marked as expected to fail.
- [x] R0 is run in the large world on code with no chat change of P05, and recorded beside the small world's R0.

## Comments

### Built, R0 pending (2026-11-01)

The record is `main-server/eval/p5/README.md`, "큰 세계 (티켓 02b)". The world holds 1,000 Quests and 307 Global Events, with 80 cases. No real model ran: the subset V line above is met by its cases, its tags and the report, and the server recall test runs them with no model. R0 stays open until the owner approves its cost and command, after the large world is merged and tagged.

The owner (`Jaehyun0320`) checked a sample of 89 model-drafted wordings on 2026-11-01: 89 kept, none changed or dropped, no note on the rest. The record is `large-world-v1/wordings-check.json`.

Decisions by the owner, beyond this ticket:

- Subset C (14 cases) holds posts known only by context, such as `증바람 5인 너만 오면 고` under 게임. It is measured apart as E9, target 0.80 and no floor, so that E1 and E3 keep the metrics document's meaning. The metrics document has it in evaluation D.
- 커피 counts as 디저트.
- 보드게임 counts as 게임. It adds three cards each to `large-c-01` and `large-c-04`.
- No case expects more than 20 cards, so what a reply cannot show is not measured.

Server recall today, checked against the real server: 15 cases hold every card and 65 miss one. Which of tickets 10 and 11 each of those waits for (16 and 41), and which wait for search stage 1 (8), is the generator's simulation; each ticket corrects its marks.

Nothing wrong was found in ticket 02's world, cases or answers.

### C0 tagged (2026-11-01)

`eval-freeze-iter3-chat-large` on `cdf3c01`, the merge commit of #152. The record is `main-server/eval/p5/README.md`. R0 is left, once its cost and command are approved.

### R0 (2026-11-01)

The record is `main-server/eval/p5/r0-large.md`, with `r0-large-failures.json` and the results. It ran on `cdf3c01`, the C0 tag, in a clean tree: 240 runs, USD 0.81. 47 runs passed and 11 of 80 cases passed all three. E7 is under its floor (79/432), E4 is 6/177, E3 and E9 are under their targets, and E1, E2 and E5 are over their floors.

Of the 193 failed runs, 131 missed cards the run's searches did not return, and 115 of those stopped with `more: true` in a result.

37 runs got 503. 33 are ticket 10a's shape. 4 have no text anywhere and called no card tool, their last step cut at 1,000 output tokens. Ticket 10a leaves those at 503, and looks for their cause in R0a's traces.

P04's chat PRs landed after this run, so the same suite ran again as R0p on `871886a` (`main-server/eval/p5/r0p.md`), the baseline R0a is compared with. G1 there is 1, `follow-up-yes-after-menus`, which now calls #142's `findMealRestaurants`. It comes from P04's change, not P05's. Whether the case or the behaviour is right is not decided here.

### Agent usage (2026-11-01)

- Agent time: about 3 hours 10 minutes (estimate), one session with two review subagents. It adds about 50 minutes for R0 and R0p and their records, and does not count the 1 hour 30 minutes the runs took.
- Tokens, subagents included: input 542, with 51,469,110 cache reads and 1,474,568 cache writes shown apart; output 453,053. Counted before this commit; what was added since 15:42 KST may include late work on ticket 02.
- Tokens of the eval model, not an agent's: R0 in the large world input 6,970,434, output 220,999, USD 0.81. R0p input 29,414,333, output 541,501, USD 3.21. No cache.
