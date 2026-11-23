# 54: Lowering a meal answer into its dock changes nothing on screen at the swap

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 52 (the sheet's motion and header). Built on its head; opened against 5.0/Main once 52 has merged.

Native files: none. Releases: an app OTA update only.

## What happens now

From the user's phone test on PR 516 (2026-11-23, about 12:40): "여전히 채팅을 올렸다가 내릴 때, 순간적으로 텍스트를 다시 그려야 해서 이질감이 느껴져."

On the emulator, with mount logs, for a meal answer whose Plan docks ("뭐 먹을까" with a Friend):

- Raising swaps the dock (`DockedCard`, `DockedAnswer`, `MealDock`: the sentence alone) for the open card (`OpenCard`, `OpenAnswer`, `MealList`: the person chips, the sentence, the kind chips, and the list) at the start of the motion.
- Lowering first runs the open card down to its own lowered height, about half the stage, and then, about 280 ms later with the motion over, swaps it for the dock. The sentence jumps up by the person chips' height, and the card's top edge drops to the dock's.
- An answer that never docks ("배고파") remounts nothing when raised or lowered.

A second finding, seen in 2 of about 10 emulator runs (once before ticket 52's last changes): after an answer came, the open card stayed near the waiting card's height. It showed the sentence and a sliver of the list, while the camera framed the answer for the full card. The card's visible height then (about 187 dp) was the waiting card's whole height: the last run of the offset, from the waiting card's step to the answer's, did not take effect. Three more runs on the production bundle with the offset's runs logged did not show it: each logged the waiting card measured (offset 678.7), then the answer (a run from 678.7 to 445.1), and nothing cut the run.

## What to build

- Lowering a meal answer that docks runs the open card down to the dock's own height, known from the dock's last layout, so that the swap happens at the same height. With no dock laid out yet, it runs to its lowered step as now.
- The raised meal card puts the Assistant's words first, in the dock's type, with the person chips under them, and then the kinds and the list. At the dock's height the open card then shows what the dock shows: the header and the words. The swap at either end changes nothing on screen, and the camera hears the dock's height once.
- Find why the open card sometimes stays near the waiting card's height after an answer comes, and fix it.

## Acceptance criteria

- [x] On the emulator, raising and lowering a docking meal answer moves the sentence nowhere at the swap: the frames before and after the swap match, but for the words one physical pixel (0.4 dp) apart. The emulator's system reduce-motion setting is on, so its runs never animate; motion was forced on and slowed in app code for the check, and no device setting was changed.
- [x] Lowering runs to the dock's height, and the open card keeps its own content until the dock stands (unit tests, with the dock laid out).
- [x] The raised meal card's order: the words, the person chips, the kinds, the list (integration test).
- [x] The camera hears the dock's height alone when lowering into it (ticket 52's last change, PR 516; emulator log).
- [ ] The short-card case: not reproduced in three runs on the production bundle with the offset's runs logged, so not fixed; it stays in the follow-ups.

## Follow-ups

- The short card after an answer comes (above): the last run of the offset, from the waiting card's step to the answer's, did not take effect in 2 of about 10 runs. Log the offset's runs on a phone or an emulator with motion on until it shows.
- (B) The same for every kind of answer that docks: a words answer with offers, a Plan beside a Quest the User holds, a Proposal, a Lookup. Each dock must equal the open card's first part, or the two forms become one card whose lower part is the dock. About a day; its own ticket.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 1 hour 30 minutes in the map-first-answer session, the emulator and test runs included (an estimate from the transcript's timestamps). No subagents.
- Tokens: an estimate: output about 37k; input about 46M, almost all cache reads, with about 63k cache writes.
- Ticket 52's later rounds (PR 516, after its last recorded pass, until it merged): about 4 hours more; output about 280k; input about 155M, almost all cache reads, with about 1.5M cache writes. Recorded here because ticket 52's file was on 5.0/Main before they could be added there.
