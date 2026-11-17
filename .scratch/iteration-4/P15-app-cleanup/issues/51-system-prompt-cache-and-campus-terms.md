# 51: The chat's system prompt is cached across Users and knows the campus's short names

Parent: [P15 spec](../spec.md), item 51; found using `snunow/main-server/26.11.16-1` on 2026-11-17 (the Assistant did not understand "아랫공대"), and from the A02 baseline's cost figures (`main-server/eval/a02-baseline.md`)
Status: ready-for-agent
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

- [ ] Two requests with the same tools and capabilities, made at different minutes and by different Users, have equal bytes up to the cache breakpoint. A unit test builds both and compares them.
- [ ] The `Now in Korea` line is still in every request, after the breakpoint, with the same words.
- [ ] On the OpenRouter path the request holds the same instructions in the same order.
- [ ] The campus short names are data: adding an entry changes the rendered fragment and nothing else. A unit test renders the list and checks that every short name and its meaning is in it.
- [ ] Every first entry is checked against the server's Places and Restaurants; the ones that matched nothing are listed in the ticket's Comments.
- [ ] P19 and the P5 small world on Anthropic, before and after, are in the pull request with the scores side by side, and agree within noise or the difference is explained.
- [ ] The cross-minute measurement is in the pull request: tokens read and written and the cost, before and after.
- [ ] The short-name questions' transcripts are in the pull request.
- [ ] `main-server/README.md` says where the list is and how a name is added, and ADR 0013 or the adapter's comment says what is cached and what is not.
- [ ] Tests by ADR 0007: unit tests for the prompt's parts and the list; the adapter's existing tests still pass.

## Comments
