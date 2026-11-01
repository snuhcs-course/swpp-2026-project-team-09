# 10a: An answer written beside a tool call reaches the User

**What to build:** When the model writes its answer in the same step as a tool call and ends the next step with no words, the User gets that answer and what was shown, instead of the Assistant's error.

The cause is known, from R0's traces (`main-server/eval/p5/r0.md`, "빈 답 503"). `runFeature` in `adapter.ts` reads `generateText`'s `text`, which is the last step's only, and treats an empty one as no answer. All 41 such runs, 31 of 300 in the P05 suite and 10 of 216 in P19, had the answer in an earlier step and a last step of one output token.

**Blocked by:** 02b, whose R0 runs on the code before this change.

**Status:** ready-for-agent

- [ ] When the last step's text is empty, the reply takes the text of the latest step that has any.
- [ ] When no step has text and the reply holds cards, map buttons or a Proposal, the reply carries a fixed sentence, such as "찾은 결과예요.", and what was shown. The server logs that it was used.
- [ ] With no text and nothing shown, or at the step limit, the answer stays 503.
- [ ] A last step that has text is used as today, whatever earlier steps wrote.
- [ ] Integration tests with the scripted model cover each of these.
- [ ] R0a is run (this change alone) in both worlds, with P19 three times on the same commit, and recorded beside R0. Its cost and command are approved before it runs.
