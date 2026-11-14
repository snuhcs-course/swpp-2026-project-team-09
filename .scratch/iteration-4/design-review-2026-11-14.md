# The agentic map: design review of 2026-11-14

## How it was reviewed

The design record (`agentic-map-design.md`) and the wireframes went through two rounds of review on 2026-11-14. Each round looked through six lenses:

| Lens | What it asks |
|---|---|
| The professor | Does the design answer what the professor asked for, in an app the professor will use? |
| The TA | Does it meet the grading points: technical depth, metrics, Party versus Quest, Friends versus strangers, and the demo? |
| The student | Would a first-year or a third-year open it every day, and what would make them delete it? |
| The builder | Can one developer build it by 12/04? |
| The team's bar | Does it answer the concerns the team raised? |
| Novelty | What does it do that existing products and research do not? |

In the first round, each lens gave a verdict and a score out of 10, and three more reviewers audited the wireframe rows against the record. A second reviewer then checked each judgment against the files. Each lens also wrote what a 10 would need, and those answers were combined into one plan, which was then scored again. The second round looked at the design again after it was fixed the same day, with the same six lenses and the same check.

The reviewers were automated. The scores are their opinions, not grades, and nothing in the review is a decision. A score is not the highest this direction can reach.

## Scores

In the first round every lens gave the same verdict: fine once fixed. The second round's first column is the checked first-round score.

| Lens | First round | First round, checked | Today, nothing built | Design only | Built as drawn | Built and measured |
|---|---|---|---|---|---|---|
| The professor | 6 | 6 | 6 | 8 | 8 | 8 |
| The TA | 5 | 5 | 6 | 7 | 7 | 8 |
| The student | 6 | 6 | 7 | 8 | 7 | 8 |
| The builder | 4 | 4 | 5 | 7 | 8 | 8 |
| The team's bar | 6 | 6 | 7 | 8 | 8 | 8 |
| Novelty | 5 | 4 | 5 | 6 | 6 | 7 |

- On the design alone, five lenses give 7 or 8 and Novelty gives 6.
- With nothing running today, no lens gives the app an 8. For the app to get an 8, the design has to be built and measured.
- No check gave a 9.

## What the second round found closed

Of the first round's must-fix points, these are closed:

- How the map shows an answer and zooms depending on how many results there are.
- The depth claim and what will be measured.
- The member who runs late.
- The words on screen. On screen a "파티" (party) is a Quest that several Users hold, "모집" (recruiting) is taking people into a public one, and "파티 켜기" (party on) is the glossary's Party.
- Friends as the center of the app, with public recruiting as the fallback.
- The screen for someone who opens the app for the first time.
- The one sentence that says what the app is.

## What still blocks an 8 or a 9

| Lens | What blocks it | Where it is addressed |
|---|---|---|
| The professor | The everyday map shows Friends with labels before anyone asks | The design. Not decided |
| The professor | Sharing settled between agents was left out | The presentation says why it was left out and what was done instead (record section 8) |
| The TA, Novelty | There is no set of location questions and no numbers | Evidence. Measured after building |
| The TA, the student | The metrics had no target numbers and the first answer had no target time | Added to record section 5 |
| The builder | There is no contract for what the Assistant takes and returns | The work split, section 3: the contract due Saturday at noon |
| The builder | The record disagreed with itself about who re-plans | Record section 5 now says it: the server recalculates and the model only extracts conditions from what the User says |
| The builder | The native release listed only push notifications | The work split, section 7 |
| The team's bar | The design did not say at a glance how many steps further the killer feature goes | Three lines added to record section 1 |
| Novelty | Every piece has a near neighbor, so what is new is the combination and one interaction sequence | The claim is set on the map-based agent (record section 1). Correcting on the map is measured against correcting by text (record section 12) |

## Novelty, judged again after the product survey

The novelty claim was set on the map-based agent, an Assistant and a map bound in both directions, and 33 products and papers were surveyed (record section 11). Only the Novelty lens was scored again. The judge and the check gave the same scores: 6 for the design alone, 7 built as drawn, and 7 built and measured.

| Claim | Verdict | The closest thing found |
|---|---|---|
| The answer is corrected on the map | Different but shallow. By the professor's bar, a new interaction sequence, it is the strongest of the four | A research prototype that reads the on-screen map as context (IMAIA), and Ask Maps, which is corrected by text |
| The place, the time, and the merging point are decided from several people's Timetables, locations, and walking times, and drawn as one route per person | Not found as a combination | Midway spots (Ask Maps, MeetHalfway) and a meeting time (Gemini in Calendar). Continua could not be checked |
| Everyone's plan is fitted again after a decline or a late member | Different but shallow | Apps that show lateness (Konverge, Glympse) and research that revises a suggested time (Togedule) |
| An Assistant that uses a Friend's location only up to the level that Friend chose | Different but shallow. It is a safeguard | Approximate location sharing (Life360 Bubbles, hiding by group in KakaoMap) |

- Recalculation calls one engine, but the weight of the claim is on the interaction on the map, not on the calculation.
- Why the score does not rise further: every piece has a near neighbor, so what is new is the combination and one interaction sequence. The evidence is only that a limited search found nothing. The five measures test the calculation and the model, not whether correcting on the map beats correcting by text.
- What not to say: that it is the first AI map, that no assistant decides where several people meet, or that its absence elsewhere has been proved.

## What a 9 or 10 would need

- No lens reaches 10 by the final presentation on 12/14. In the first round, each lens put the highest it could reach by 12/04 at 8 for the professor, the TA, the student, and the team's bar, and 7 for the builder and Novelty.
- A location question set of 50 or more, built from real class times and the walking table, with answers computed in advance and rescored by one command.
- That set compares three methods (model only, the nearest-place rule, and ours) on five numbers: everyone arrives on time, time together as a share of the best, condition-extraction accuracy, answers beyond the visible level (target 0%), and the time to the first answer (the review asked for the p95; the design's target is the median).
- Tests show that one function decides how much of a Friend is visible, and that no Assistant tool, map API, or socket leaks more.
- Three-person groups book the same lunch once in a group chat and once in the app, and the message count and time taken are recorded.
- A 10 needs all four: most of the wireframe rows running in the real app, real friend groups using it for weeks, one new interaction that works only on a map, and the model taking the hard part and beating the baselines by a wide margin.
