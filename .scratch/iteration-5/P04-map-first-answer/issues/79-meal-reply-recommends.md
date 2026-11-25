# 79: A meal reply recommends its first place, and the Assistant's words stay when another place is chosen

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: #580
Blocked by: none.

Native files: none. Releases: a main server deployment and an app OTA update.

## What happens now

A meal answer's reply reads "301동식당이 가장 가까워서 11:30에 먹어요.": it says the meal is decided, at a time the time card and the map's label already give. Once the User chooses another place, the card drops the Assistant's words for the chosen place's own line ("동원관식당 · 11:00 · 이동 32분 · …"), so the model's answer is rewritten on screen.

The user's decision (2026-11-26): the reply reads awkward; "뭔가 추천해요 같은 멘트를 남겨서 다른 항목을 선택하더라도 어색하지 않게 하는 건 어때?". On choosing another place: "그대로 두고 싶어. 모델이 답변한 것을 의도적으로 바꾸는건 이상한 것 같아."

## What to build

1. The meal rules ask for one sentence that recommends the first plan with why it comes first, in the User's terms, and no time of the meal: "가장 가까운 예술계식당을 추천해요.", "수업 끝나고 바로 갈 수 있는 301동식당을 추천해요.", "둘 다 가까운 302동식당을 추천해요.", "한식이 나오는 학생회관식당을 추천해요.". The order-unknown cases keep their true reason ("15:30 302동 수업까지 가장 덜 걷는 3식당을 추천해요."). fellBack's sentence, alreadySet, related, none, the later-day lunch note, the shuttle note and the question back stay, reworded only where they said "…에 먹어요". Still one sentence, still nobody's walk minutes (`withoutWalkSentences` stays).
2. The words over a meal answer's list show the Assistant's words while the Plans on screen are the reply's, whichever of them is chosen. A kind chosen by a chip changes no Plan and calls no model, so the words stay. The chosen place's own line shows only where the model has no words for the answer on screen: a recalculated answer (people picked, a moved time, the other meal), an answer without words, and the "…뿐이에요" case as before. The dock draws the same words; the keyboard headline (`headlineOf`) is no longer drawn since PR 479.
3. The mock replies and the test sentences recommend in the same way.

## Acceptance criteria

- [x] Tests fail on the code before: choosing the second place, and a kind chip that moves the pick, keep the reply's words (`meal-words` unit, `answer-meal-list` integration).
- [x] A recalculated answer shows the chosen place's line, at its first place and another.
- [x] The meal rules hold no "…에 먹어요"; the eval cases `meal-dinner-one-sentence` and `meal-wish-tomorrow-nearest` look for 추천 and no "에 먹어요" or "에서 먹어요", and pass the case schema.
- [x] No native file changes; lint and format pass on every touched file.

## Comments

Built in PR #580. The words stay while `answer.plans` is the reply's own list: a kind chosen on the phone (`withKind`) keeps that list, and a recalculation brings a new one. The eval was not run against the model.

Not part of this ticket: `__tests__/api/missing-input-replies.integration.test.ts` fails 3 of its 6 tests on 5.0/Main too, locally: the mock's answers now carry `others`, which the expected values lack.

### Agent usage (2026-11-26)

- Agent time: about 28 minutes in one session, the test runs included (an estimate).
- Tokens: input 22,202,198 (cache reads 22,001,624, cache writes 200,392, uncached 182); output 61,671. No subagents. Counted from the transcript up to the PR's opening; the context summary in the middle is not in it.
