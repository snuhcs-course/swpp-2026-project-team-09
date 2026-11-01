# 10a: Cards reach the User when the model writes nothing

**What to build:** When the model shows cards and then ends with no words, the User gets those cards with a fixed sentence instead of the Assistant's error. R0 found this: 31 of 300 P05 runs and 10 of 216 P19 runs ended so, and the cards the model had chosen were lost (`main-server/eval/p5/r0.md`, "빈 답 503").

**Blocked by:** 02b, whose R0 runs on the code before this change.

**Status:** ready-for-agent

- [ ] When the text is empty and the reply holds cards, map buttons or a Proposal, the reply carries a fixed sentence, such as "찾은 결과예요.", and what was shown. `adapter.ts` no longer treats it as no answer.
- [ ] With an empty text and nothing shown, or at the step limit, the answer stays 503.
- [ ] The server logs when the fixed sentence was used, so that its rate can be followed.
- [ ] Integration tests with the scripted model cover cards, map buttons and a Proposal without words, and an empty reply with nothing shown.
- [ ] R0a is run (this change alone) in both worlds, with P19 three times on the same commit, and recorded beside R0. Its cost and command are approved before it runs.
