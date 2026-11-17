# 51: The chat's system prompt is cached across Users and knows the campus's short names

Parent: [P15 spec](../spec.md), item 51; found using `snunow/main-server/26.11.16-1` on 2026-11-17 (the Assistant did not understand "아랫공대"), and from the A02 baseline's cost figures (`main-server/eval/a02-baseline.md`)
Status: done
Owner: AhnJinYoung
Blocked by: none

Touches the main server only. No database migration and no native file. The change reaches Users with a Release of the main server.

## What happens now

- **The cache is shared for one minute only.** On the Anthropic path a request's tools and system prompt, about 26,300 tokens, are cached up to one breakpoint at the end of the system prompt (`main-server/src/assistant/adapter.ts`, `anthropicOptions`). The system prompt's third line is `Now in Korea: 2026-11-17 Tuesday 09:05 …` (`chat/chat-assistant.ts`, `chatRules`; `koreaNow` writes the minute). So the text before the breakpoint changes every minute, and a request reads the cache only when another request with the same tools was made in the same minute. Within one answer the steps share it, since `now` is fixed for the answer.
- **The evals do not show this.** They fix `now`, so every case reads the same prefix: the A02 baseline's hit rate was 92.5–98.2 % and a turn cost about USD 0.0015. With the cache cold, a turn's first request writes the 26,300 tokens at 1.25 times the input price, about USD 0.004 a turn by the price list.
- **The model does not know what people on campus call places.** Asked about "아랫공대" it did not know what was meant. The system prompt has no list of such names.

## What changes

### 1. The time moves behind the breakpoint

- Everything that is the same for every User and every minute comes first and ends at the breakpoint: the tools, then the rules.
- What changes per request comes after it: the `Now in Korea` line, with the sentence that says how to read 오늘, 내일, 이번 주 and 점심 against it. Nothing else in the system prompt changes per request today; if the implementation finds something that does, it goes behind the breakpoint too.
- How it is sent is the implementation's choice, as long as the bytes up to the breakpoint are equal for two requests with the same tools and capabilities at different minutes and for different Users. A second system block after the cached one is the plain way. The breakpoint is then on the stable block, not on "the last system message".
- The rules keep their words. Where a rule says "read against now", it still means that line. The only edits to the rules are those the move needs.
- The OpenRouter path sends the same text in the same order, without cache options, so that the two paths stay comparable.
- The Judgement and the same-event choice are not touched: they give no tools and are not cached this way.

### 2. A list of campus short names

A new prompt fragment of its own, in the stable part, as the 공강 and 관정도서관 rules are (`free-time/free-time-rules.ts`, `library/library-rules.ts`).

- **Kept as data**, so that a name is added by adding one entry: each entry has the short names, what they mean, and an optional note. One function renders the list into the fragment. The fragment says in one line what the list is for.
- **How the model uses it**: it reads a short name in the User's message as the place or thing it stands for, and then looks it up with its tools as for any other name. The list gives no facts to answer from: menus, hours and locations still come only from tool results. It keeps answering in the User's words (a User who writes 중도 is answered with 중도).
- **The first entries**, from 안진영 on 2026-11-18. The implementation checks each against the Places and Restaurants the server has (`main-server/seed/campus-map-places.json` and the restaurant data) and writes the name as the tools find it; an entry that matches nothing is reported to the owner instead of guessed.

  | Short names | Means | Note |
  | --- | --- | --- |
  | 학관 | 학생회관 | |
  | 윗공대 | The College of Engineering buildings around 300동–303동 | The highest part of campus and the farthest from the main gate. An area, not one building. |
  | 아랫공대 | The College of Engineering buildings from about 43동 to 39동 and 신소재공동연구소 | Said to tell it from 윗공대. An area, not one building. |
  | 과방 | A department's own room for resting and studying | Usually in the department's building, but some departments have none or have it elsewhere. The app has no data on 과방: say so, and do not name a room. |
  | 버들골, 풍산마당 | 버들골 풍산마당 | |
  | 긱사, 긱 | 기숙사 | |
  | 천식 | 천원의 식사: the 1,000-won breakfast and lunch at 학생회관 식당, and the 1,000-won breakfast at 301동 식당 | At 학생회관 the menu may show 3,000 won, the price for people outside the university. |
  | 종운 | 종합운동장 | |
  | 긱운 | 기숙사 운동장 | |
  | 긱삼 | 기숙사 삼거리 | |
  | 중도 | 중앙도서관 | |

- **A general line** after the list: most other short names cut a long building name short or join first syllables; when one is not in the list and the tools find nothing for it, ask the User which place they mean instead of guessing.
- The fragment is short: the list above should add well under 1,000 tokens. Its size is reported in the pull request.

## What stays as it is

- Every rule's meaning, the tools and their descriptions, the cache mode (`breakpoints`), the effort and the retry.
- The eval cases and their labels. No label changes for this ticket.
- The admin site's Settings and the keys.

## Measuring it

All runs call the Anthropic API directly (`--provider anthropic --cache breakpoints`), on 안진영's Claude Console key in `main-server/.env`. None goes through OpenRouter. Estimated cost: about USD 1.5 in all; stop and ask before passing USD 3.

1. **The scores stay.** P19 and the P5 small world, once on the commit this branch starts from and once on the finished branch. The same suites and options for both. They agree within the suites' noise: P19 was 56–59/64 over earlier runs, and the P5 small world's floors keep their verdicts. A drop beyond that is looked into case by case before the pull request is opened.
2. **The cache is shared across minutes.** The evals cannot show this, since they fix `now`. So a small measurement of its own: the same short conversation sent N times (N about 10), each with `now` one minute later and as a different User, once on the base commit and once on the branch, reading each request's `cache_read_input_tokens` and `cache_creation_input_tokens`. Expected: on the base every first request writes about 26,300 tokens; on the branch only the first of the N does, and the others read them. The pull request reports the tokens read and written and the cost of both, per request and in total. It is a script or an eval option kept in `main-server/eval/`, so that it can be run again.
3. **The short names are understood.** A handful of questions asked once on the branch, with their transcripts in the pull request, not scored: for instance "아랫공대 근처 식당 알려줘", "학관 오늘 메뉴 뭐야", "중도 자리 있어?", "천식 오늘 뭐 나와?", "우리 과 과방 어디야?". For each: what the model called and what it answered.

## Acceptance criteria

- [x] Two requests with the same tools and capabilities, made at different minutes and by different Users, have equal bytes up to the cache breakpoint. A unit test builds both and compares them.
- [x] The `Now in Korea` line is still in every request, after the breakpoint, with the same words.
- [x] On the OpenRouter path the request holds the same instructions in the same order.
- [x] The campus short names are data: adding an entry changes the rendered fragment and nothing else. A unit test renders the list and checks that every short name and its meaning is in it.
- [x] Every first entry is checked against the server's Places and Restaurants; the ones that matched nothing are listed in the ticket's Comments.
- [x] P19 and the P5 small world on Anthropic, before and after, are in the pull request with the scores side by side, and agree within noise or the difference is explained.
- [x] The cross-minute measurement is in the pull request: tokens read and written and the cost, before and after.
- [x] The short-name questions' transcripts are in the pull request.
- [x] `main-server/README.md` says where the list is and how a name is added, and ADR 0013 or the adapter's comment says what is cached and what is not.
- [x] Tests by ADR 0007: unit tests for the prompt's parts and the list; the adapter's existing tests still pass.

## Comments

### Notes from the implementation (2026-11-18)

- **How it is sent.** `Feature.instructions` is now a string, the same for every request of the feature; the new optional `Feature.requestInstructions(now)` gives the lines of one request. `runFeature` passes both to the SDK as two system messages, stable first. On the Anthropic path (`@ai-sdk/anthropic` 4.0.81) consecutive system messages become two blocks of the request's `system`, and the middleware puts `cache_control` on the **first** system message (it was the last). On the OpenRouter path the two go as two `system` messages in the same order, with no cache mark. The Judgement and the same-event choice send one system message, so for them first and last are the same and nothing changed.
- **What moved.** Only the `Now in Korea: … Read days and times such as 오늘, 내일, 이번 주 and 점심 against it.` line, word for word, now the chat's `requestInstructions`. Nothing else in the prompt changes per request. No rule's wording changed.
- **The cached prefix.** For an app with every capability, the tools and the stable prompt are 43,826 tokens (the cross-minute run's cache read); the campus-terms fragment adds 744 tokens (counted with the Messages API's free token count). The ticket's 26,300 is the P19 world's smaller tool set.
- **Entries checked against the seed** (`seed/campus-map-places.json`, `national-map-places.json`, `restaurant-places.json`, the shuttle stops). Written as the tools find them: 학생회관 (63동); 유회진 학술정보관 (300), 제1공학관 (301), 제2공학관 (302), 해동첨단공학관 (303, from the national map); 데이터사이언스대학원 및 공과대학 강의동 1 (43), 대학원연구동(1단계) (39), 신소재공동연구소 (131); 버들골 풍산마당 (100); 종합운동장; 중앙도서관 (two Places: 중앙도서관 본관 62, 중앙도서관 관정관 62-1); 학생회관식당 and 301동식당 (Restaurants).
- **Entries that matched nothing, or not as written** (for the owner):
  - 긱삼 → 기숙사 삼거리: no Place. Only the shuttle stop `기숙사삼거리` has the name. The entry says so.
  - 긱사, 긱 → 기숙사: no Place is named 기숙사 except the three 외국인학생기숙사 (915–917동). The dormitory is 관악사: `(관악사)학부 생활관` (919) and `(관악사)대학원 생활관` (900). The entry says "기숙사, which is 관악사: …".
  - 긱운 → 기숙사 운동장: no Place of that name; the Place is `관악사운동장`. The entry names it.
  - 과방: no data, as the ticket says. The note tells the model to say so.
  - 천식: 천원의 식사 is no Place or Restaurant; the two Restaurants it names exist.
- **One change after the first after run.** I first wrote 중도 as "중앙도서관 본관 and 중앙도서관 관정관". P19 on that commit (`ee573f6c`) failed `out-of-scope-library-seats`: the model read "중앙도서관 열람실" as 관정관's and listed its seat spaces. The entry now says only 중앙도서관, as the owner wrote it, and `resolvePlace` finds the two Places. Both after runs are kept; the scores below are of the final code (`d4774178`).
- **Scores, before (`dc27a523`) and after (`d4774178`).** P19: 59/64 → 56/64, pass^3 5/5 → 5/5, known failures passed 2/8 → 4/8 (`menus-abbreviation-hakgwan` and `making-parties-abbreviation-hakgwan`, the two 학관 cases, now pass). The non-known failures after are cases that failed in earlier runs too (`edd356ae`, `40cb60e5` -3/-4/-5); 56 is inside the 56–59 of earlier runs. P5 small world: 240/300 → 250/300, pass^3 73/100 → 75/100; every floor keeps its verdict (J10 under its floor in both).
- **Cross-minute.** Base: each of 10 requests wrote 43,276 tokens, USD 0.0545 in all. Branch: the first wrote 43,978, the other nine read 43,826 and wrote 152 each, USD 0.0101 in all (−82%).
- **Tests.** The bytes-equal check is a unit test that sends the real chat feature, built over services with no data (`test/chat-services.ts`), through the real provider library to a fake fetch. `test/scripted-model.ts`'s `system()` now joins the system messages.
- Spent on the API: USD 1.24 (P19 ×3, P5 ×2, cross-minute ×2, the short-name questions).

### Agent usage (2026-11-18)

- Agent time: about 1 h 40 min in one session (an estimate), most of it waiting on the four eval runs.
- Tokens (an estimate; one agent, no subagents): output about 45k; input about 6.5M, of which about 6.2M cache reads and 0.3M cache writes.
