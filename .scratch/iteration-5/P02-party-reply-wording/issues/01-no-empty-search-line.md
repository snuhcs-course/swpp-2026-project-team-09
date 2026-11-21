# 01: Nothing said of a search that found none

Parent: [P02 spec](../spec.md); a tester's feedback of 2026-11-21 and a benchmark run of `5.0/Main` (3b06611a) the same night
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: a main server deploy only; the app does not change.

## What happens now

The sentence is the model's, written as the chat's system prompt tells it (`main-server/src/assistant/chat/chat-assistant.ts`). Since Iteration 3's P05, a request to make or recruit a 파티 first searches for one to join. The prompt then says: "When none fits, call proposeQuest as below, with a line saying that none was found". A general rule adds that on a result "none" the model says plainly that there is none and why. P05's evaluation C requires the line too: its `propose` cases must mention 없, 찾지 못 or 못 찾.

The search also runs for a 비공개 파티, such as a meeting with one named Friend, although the rules offer only Open and Approval 파티 from it, and joining one would not bring the Friend.

## What changes

- After a search that found none, the reply says nothing of the search: never that the Assistant looked, nor that none was found. It speaks only of the proposed 파티, in a sentence or two. The general rule about result "none" leaves this search out.
- A request whose 파티 would be closed (비공개, or only for Friends the User names) goes straight to proposeQuest, with no search.
- When 파티 to join are found, the reply asks whether the User wants to join one or make a new one.
- P05's frozen rules and cases stay as they were, and the revision is added beside them: `eval/p5/rules.md` (section 4) states it under the old rule, `eval/p5/cases/join-or-recruit-revised.yaml` holds a copy of each of the ten `propose` cases (`join-04-r5` and so on) whose reply must not hold 찾지 못, 못 찾, 찾았지만, 찾아봤, 찾아보니, 없었, 없어서 or 없네, and `eval/p5/suite.yaml` lists the pairs under `revised`. P05's spec marks its four sentences that asked for the line as revised by this ticket.
- A benchmark case in the small world asks the tester's question with the Friend 이민수 (`making-parties-meet-friend-at-two`).

## What stays as it is

- The search before an Open or Approval 파티, its rules and the tool's result.
- The Proposal card and the answer screen.

## Acceptance criteria

- [x] On a request to make a 파티 for which none fits, the reply does not mention the search. Benchmark, OpenRouter's Claude Haiku 5.5, once each: P05's join-04, join-29 and join-30, with the words now in `join-04-r5`, `join-29-r5` and `join-30-r5`, search, propose and say nothing of the search.
- [x] When 파티 fit, they are shown and joining is offered first. Benchmark: join-01 and join-03 show the found 파티 and ask whether to join one or make a new one.
- [x] The tester's question proposes the closed 파티 with no search, and its reply mentions no search. Benchmark: `making-parties-meet-friend-at-two` failed on `5.0/Main` (it searched, and said "참여할 수 있는 파티는 없었어요") and passes after the change; `making-parties-lunch-with-friend` passes 3 of 3.
- [x] The system prompt holds the new rules, and a reply after an empty search carries the Proposal with the model's text only. (Integration test with the scripted model.)
- [x] The benchmark's cases still fit their schema and world, and each revised P05 case differs from its frozen case only in its words. (`eval-cases` and `eval-p5-cases` integration tests.)
- [x] oxlint, Prettier and tsc pass on the main server.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 1 hour 40 minutes in one session: about 50 minutes up to the pull request, then about 50 minutes for the check on the emulator against a local stack of this branch and for the reviews' fixes. An estimate from the session's timestamps.
- Tokens, the whole session: input about 35.4M, of which about 35.0M were cache reads, 0.40M cache writes and under a thousand uncached; output about 87k. No subagents. The model calls of the benchmark and of the emulator check (Claude Haiku 5.5 on OpenRouter) are apart: about 0.9M input and 10k output tokens for the benchmark, and one chat turn on the emulator.
