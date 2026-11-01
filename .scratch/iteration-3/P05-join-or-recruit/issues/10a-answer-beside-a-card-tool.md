# 10a: An answer written beside a tool call reaches the User

**What to build:** When the model writes its answer in the same step as a tool call and ends the next step with no words, the User gets that answer and what was shown, instead of the Assistant's error.

The cause is known, from R0's traces (`main-server/eval/p5/r0.md`, "빈 답 503"). `runFeature` in `adapter.ts` reads `generateText`'s `text`, which is the last step's only, and treats an empty one as no answer. All 41 such runs, 31 of 300 in the P05 suite and 10 of 216 in P19, had the answer in an earlier step and a last step of one output token.

**Blocked by:** 02b, whose R0 runs on the code before this change.

**Status:** ready-for-agent

- [x] The reply's text is the text of every step that has any, in order, a step that repeats the one before it left out. So an empty last step no longer loses the answer written beside a tool call.
- [x] When no step has text and the reply holds cards, map buttons or a Proposal, the reply carries a fixed sentence, such as "찾은 결과예요.", and what was shown. The server logs that it was used. No run of R0 or R0p had this shape, so this is a guard, and R0a will not measure it.
- [x] With no text and nothing shown, or at the step limit, the answer stays 503.
- [x] Integration tests with the scripted model cover each of these.
- [x] The eval trace keeps what a step cut at the output limit wrote: its content parts, its reasoning tokens and the provider's raw response. Only the trace keeps it, not the server's logs, and no answer changes. A test covers it with the scripted model.
- [x] R0a is run (this ticket's change alone: the 503 fix and the joined text together, recorded apart by rescoring its traces with the last step's text) in both worlds, with P19 three times on the same commit, recorded beside R0 and compared with R0p (`main-server/eval/p5/r0p.md`), the baseline after P04's chat PRs. Its cost and command are approved before it runs.
- [x] From R0a's traces, this ticket analyses the runs with no text and no card that were cut at the output limit, records the cause or what could not be told, and proposes what to do about them: a new ticket, or accepting them. The proposal goes to the P05 owner; this ticket does not make the fix.

## Comments

### R0p (2026-11-01)

P04's #141 and #142 changed the chat after R0, so R0p repeated the suite on `871886a`, and R0a is compared with it. This shape is 24 of 300 runs in the small world, 28 of 240 in the large one and 6 of 216 in P19. One of P19's runs had its answer beside `showRestaurants`, a card tool that R0 did not have.

14 large-world runs across R0 and R0p (4 and 10) got 503 with no text in any step and no card tool called, their last step cut at 1,000 output tokens. This ticket leaves them at 503, with nothing to save, and the owner decided on 2026-11-01 that it finds their cause and proposes what follows, since today's trace does not say what was cut. See `main-server/eval/p5/r0-large.md`, "글 없이 끝난 실행".

An R0a costs about USD 3.21, what R0p cost, since the prompt grew.

### Decisions (2026-11-01)

The P05 owner decided, before the implementation:

- **The reply joins every step's text**, as `4f71e368` does (`5c3baa3d` on this branch), in place of this ticket's first version, which took a last step's text alone. R0p's 200 replies had an earlier step's different text thrown away in 153 of 695 (22.0%). Rescoring R0p with the joined text flips no run in either P05 world (103/300, 50/240), and 10 P19 runs from fail to pass, none the other way. The joined text repeats itself where the model restated its answer, which no metric sees. R0a's record reads a sample and counts it.
- **R0a holds two changes**, which metrics 4.4 advises against. Cards do not depend on the text, so the P05 worlds' card metrics read as the 503 fix. For P19, its traces are rescored with the last step's text. The three live P19 cases send the reply back, so those cannot be split this way.
- **The fixed sentence is `아래에서 확인해 보세요.`**, for cards, map buttons and a Proposal alike, since the ticket's example "찾은 결과예요." does not fit the last two. With no question mark, it does not read as an ASK.
- **The log** is a warning from `AssistantService`: `The Assistant answered with its fixed sentence: no step had text (finish reason stop, 2 cards, 0 map buttons, no Proposal)`.

### R0a (2026-11-01)

R0a ran on `60fc2da` for USD 3.25. The record is `main-server/eval/p5/r0a.md`, with `r0a-failures.json`, compared with R0p.

- The 503 this ticket fixes is 0 in all three sets: 24/300 to 0/300 in the small world, 28/240 to 0/240 in the large one, 6/216 to 0/216 in P19. No reply used the fixed sentence.
- Passes went from 103/300 to 118/300 and from 50/240 to 55/240. Rescored with the last step's text they stay 118 and 55, with no run flipped, so joining added none of them. At case level the small world has 11 fixed and 2 flipped, past the bar in metrics 4.4; the large world's 3 and 0 is a direction.
- P19 without the known failures: R0p 59, 54, 56 of 64; R0a 61, 60, 60; R0a with the last step's text 58, 57, 57. So joining added 3 in each run. The live cases do not split, though only one of their turns had text in two steps.
- G1 stays 1, `follow-up-yes-after-menus`, as in R0p.
- `live-lunch-then-seven` went from 3/3 to 0/3. It is not in G1's baseline, and its first turn has text in its last step alone, so joining did not change what the second turn read. The record does not call it a regression or noise.
- 164 of 756 replies were joined. An agent read 40 of them: 5 say the same answer almost word for word twice, 18 repeat part of it, 17 overlap little. No metric sees this. The record proposes that a prompt ticket reduce it.

### Runs cut at the output limit: cause and proposal (2026-11-01)

**Cause.** The model reasons by default, we pass no reasoning setting, and its reasoning counts against `maxOutputTokens`. Of the 9 large-world 503s with no text, 8 spent all 1,000 tokens on reasoning and wrote nothing. The other spent 601, then had its fourth parallel tool call cut; the SDK runs no tool on a step that ended at the limit, so the run ended with no text. The 13 other cut runs answered: 9 had a card tool's input cut to `{}` and called it again, and 3 of the other 4 sent a sentence cut in the middle.

**What could not be told.** What the model reasoned about. The raw response has `reasoning: null` and only a signature in `reasoning_details`. Input size alone does not explain it: at 15,000 to 20,000 input tokens, 21 of 319 large-world steps were cut and 0 of 112 small-world steps.

**Proposal to the P05 owner: a new ticket, not accepting them.** 22 of 240 large-world runs are cut and 9 get no answer. The ticket keeps reasoning from using up the output limit, by a higher `maxOutputTokens` or a reasoning setting, whichever works on this model through OpenRouter, one per run. It measures the large world's `length` steps and no-text 503s, and comes after R2, whose trace counts them again first, since R1 and R2 change what the model reads. This ticket makes no fix.

### Agent usage (2026-11-01)

- Agent time: about 2 hours 40 minutes (estimate), two sessions of one conversation with four review subagents, summed from the transcript with gaps capped at 5 minutes. It does not count the 1 hour 6 minutes R0a itself took. The session behind `4f71e368`, which this branch cherry-picks, is not counted: its usage is not known here.
- Tokens, subagents included: input 444, with 41,851,166 cache reads and 1,174,435 cache writes shown apart; output 428,741. Counted before this commit.
- Tokens of the eval model, not an agent's: R0a input 29,777,450, output 538,365, USD 3.25. No cache.
