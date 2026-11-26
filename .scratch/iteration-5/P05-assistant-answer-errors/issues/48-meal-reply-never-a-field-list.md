# 48: A meal reply the model wrote no words for still recommends in a sentence

Parent: [P05 spec](../spec.md); the user's phone (2026-11-26): a lunch answer's words were "301동식당 · 11:30 · 걸음 4분 · 돌솥비빔밥 · 6,500원"
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server.

## What happened

- The line is not the model's. It is the app's own line for the chosen plan (`mealWordsOf` in `mobile/src/screens/main/answer/meal-words.ts`), drawn when a reply has no words of the model's.
- When no step of the model writes text, the main server sends its stand-in "아래에서 확인해 보세요." (`wordless-reply.ts`). The app counts the stand-in as no words and puts the plan's line, with its walk, dish and price, where the sentence goes.
- Which turn had no words cannot be told without the server's log. The log's warning "answered with its fixed sentence" is the sign.

- Why the model wrote nothing: several rules tell it to write nothing after a tool (findMenu found, findWay, refuse), and a menu question's answer is now a meal answer (P04 ticket 72). Nothing in `PLAN_RULES` said the one sentence is never left out. Production logged one such warning on 2026-11-26, during the user's testing.

## What changes

- **The cure, a rule:** the meal reply's one sentence is never left out. Unlike after findMenu, findWay or refuse, it is written after every planMeal that answers planned.
- **The safety net, a sentence from the plans:** when a reply draws a meal answer with plans and the model still wrote no text, the main server writes the rules' sentence itself. It names the first plan's Restaurant with why it comes first, as the order has it:
  - the kind of food asked: "한식이 나오는 학생회관식당을 추천해요.";
  - the least walking: "가장 덜 걷는 301동식당을 추천해요.";
  - the least walking on to the next Class when the User's origin is unknown: "13:00 302동 수업까지 가장 덜 걷는 …";
  - the earliest start with neither origin nor next item;
  - the name alone when another plan walks less.
- A name's bracketed part is not read for the particle ("아워홈(901동)을"). A menu's answer, opened at its Restaurant, gets no sentence.
- **The warning:** it stays for a meal answer left without words. It is no longer logged for a menu's answer, which has no words by its rules, so the real cases stand out.
- The app's line after a recalculation on the phone stays as P04 ticket 79 has it.

## Acceptance criteria

- [x] A run whose model writes nothing over a meal answer with a plan replies with the sentence. It replied with the stand-in before. (Unit test, failing before the change.)
- [x] Why the first plan comes first, by each reason above, and the particles; no sentence for no plan, a menu's answer, a meet, or no answer. (Unit tests.)
- [x] No warning for a menu's answer with no words. (Unit test.)
- [x] The rule, with the eval case `meal-wish-writes-its-sentence`. Not run: no model key on this machine.
- [x] Whole lint, format and types of the main server.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 15 minutes of one session, for tickets 48, 49 and 50 together (one pull request), including finding the causes. An estimate from the transcript's timestamps, gaps over 5 minutes left out.
- Tokens, for the three together: input about 27.2 million, of which 26.9 million were cache reads, 292,000 cache writes and 198 uncached; output about 63,000. No subagents. Measured from the session's transcript when the pull request was opened.
