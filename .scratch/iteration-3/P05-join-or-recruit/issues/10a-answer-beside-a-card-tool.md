# 10a: An answer written beside a tool call reaches the User

**What to build:** When the model writes its answer in the same step as a tool call and ends the next step with no words, the User gets that answer and what was shown, instead of the Assistant's error.

The cause is known, from R0's traces (`main-server/eval/p5/r0.md`, "빈 답 503"). `runFeature` in `adapter.ts` reads `generateText`'s `text`, which is the last step's only, and treats an empty one as no answer. All 41 such runs, 31 of 300 in the P05 suite and 10 of 216 in P19, had the answer in an earlier step and a last step of one output token.

**Blocked by:** 02b, whose R0 runs on the code before this change.

**Status:** ready-for-agent

- [ ] When the last step's text is empty, the reply takes the text of the latest step that has any.
- [ ] When no step has text and the reply holds cards, map buttons or a Proposal, the reply carries a fixed sentence, such as "찾은 결과예요.", and what was shown. The server logs that it was used. No run of R0 or R0p had this shape, so this is a guard, and R0a will not measure it.
- [ ] With no text and nothing shown, or at the step limit, the answer stays 503.
- [ ] A last step that has text is used as today, whatever earlier steps wrote.
- [ ] Integration tests with the scripted model cover each of these.
- [ ] The eval trace keeps what a step cut at the output limit wrote: its content parts, its reasoning tokens and the provider's raw response. Only the trace keeps it, not the server's logs, and no answer changes. A test covers it with the scripted model.
- [ ] R0a is run (this change alone) in both worlds, with P19 three times on the same commit, recorded beside R0 and compared with R0p (`main-server/eval/p5/r0p.md`), the baseline after P04's chat PRs. Its cost and command are approved before it runs.
- [ ] From R0a's traces, this ticket analyses the runs with no text and no card that were cut at the output limit, records the cause or what could not be told, and proposes what to do about them: a new ticket, or accepting them. The proposal goes to the P05 owner; this ticket does not make the fix.

## Comments

### R0p (2026-11-01)

P04's #141 and #142 changed the chat after R0, so R0p repeated the suite on `871886a`, and R0a is compared with it. This shape is 24 of 300 runs in the small world, 28 of 240 in the large one and 6 of 216 in P19. One of P19's runs had its answer beside `showRestaurants`, a card tool that R0 did not have.

14 large-world runs across R0 and R0p (4 and 10) got 503 with no text in any step and no card tool called, their last step cut at 1,000 output tokens. This ticket leaves them at 503, with nothing to save, and the owner decided on 2026-11-01 that it finds their cause and proposes what follows, since today's trace does not say what was cut. See `main-server/eval/p5/r0-large.md`, "글 없이 끝난 실행".

An R0a costs about USD 3.21, what R0p cost, since the prompt grew.
