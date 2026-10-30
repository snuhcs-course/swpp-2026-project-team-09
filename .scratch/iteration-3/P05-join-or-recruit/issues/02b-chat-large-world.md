# 02b: Chat metrics: the large world

**What to build:** A second eval world with hundreds of Quests and Global Events, generated with their answers known, so that finding every matching Quest is measured at a realistic scale, both for the server alone in CI and for the real model. It is test data only: each run seeds it into a fresh database container, and it never reaches the Dev Server or Production. Spec: `../spec-chat.md`, "Eval world and cases"; metrics: `../references/iter3-p5 메트릭.md` evaluation D.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A generator makes about 1,000 Quests and a few hundred Global Events from attributes (activity, time, Place, capacity, Holders, started or not) with a fixed random seed; the generator and its seed are part of the commit the runs name.
- [ ] Titles vary by a list of wordings per activity (synonyms, typos) that a person wrote or checked; wordings made by a model are checked on a sample, and the sample is recorded.
- [ ] Hand-made traps are added on top: look-alike words ("배민"), 대면 against 비대면, times at a window's edge.
- [ ] Each case's expected cards are computed from the attributes, not labelled by hand, once, and stored with the case; a run never computes them again, so that a later change to the matching rules cannot change the answers.
- [ ] The generated Quests and Global Events are committed as a data file under a versioned name (`large-world-v1`); a run reads only that file and never runs the generator, which is used only to make a new version.
- [ ] Seeding reads the data file through its own loader, so that a schema change is met by changing the loader, never the data file.
- [ ] Any change to the world's data or answers makes a new version; scores from different versions are never put side by side.
- [ ] Scoring compares the set of cards shown with the expected set through one step that turns the Assistant's reply into card ids, so that a later change in how replies show cards needs only that step changed.
- [ ] The harness lets a case name the world it runs in; the existing cases keep the small world unchanged.
- [ ] Subset V (more matches than fit in one result, answers late in the day) runs in the large world, with cases for the other subsets at scale.
- [ ] A test in CI, with no model, calls the search tools with each case's intended inputs and checks that the server's result holds every expected card (server recall), so that a failure can be told apart from the model's.
- [ ] R0 is run in the large world on code with no chat change of P05, and recorded beside the small world's R0.
