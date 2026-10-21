# AI chat improvements

- Written: 2026-10-20 21:11 (KST)
- Review applied: 2026-10-21 (the summary's shape and trust, 1-5 and 3-4 merged, 3-2's premise corrected, 3-5 decided as structured input with Monday-to-Sunday weeks, 3-6 argued without a citation, and more)
- Base: `2.0/Main`, commit `ef3101d` (right after P07-08 was merged)
- Status: proposal, not implemented yet. Section 3 is what the 2026-10-20 discussion agreed to adopt
- How it is measured: the evaluation harness plan, [eval-harness-plan.md](eval-harness-plan.md), settled in [the P19 spec](../spec.md)

## Background: what the current structure lacks

- **No record of tool calls survives from one turn to the next.** The server stores no conversation; the app sends the latest 20 messages with every request. All the LLM knows of earlier turns is three things:
  - what the User said and the text of its own replies
  - `[Cards shown: quest <id>, …]`: only the ids of the cards it showed
  - `[Proposal shown: {…}]`: the values of the last Proposal

  Which tools it called, with which conditions, and what they returned, it does not know on the next turn.
- **The log holds only the cause of a failure.** It is the one line `The Assistant did not answer: <cause>`. Whether a turn succeeded or failed, the tools it called cannot be seen.

The summary of 1 and the log of 2 are made from **the same run record**. Doing 2 first therefore settles the record's shape, and lets the log show the effect of 1. Section 3 holds separate improvements that were adopted; some of them rely on 1.

---

## 1. Pass a summary of the previous turn's tool calls to the next turn

### Problem

| The User's follow-up | What happens now |
|---|---|
| "그중에 내일 거만" | It does not know the earlier search's conditions (Board, period). It guesses them from its own reply text and searches again from scratch |
| "두 번째 거" (after a resolver returned several) | It has no candidate list. It must find the name in its own sentence and resolve again |
| Friends with the same name | Resolving by name returns several every time, so **there is no way to settle on one** |
| "더 보여줘" | It does not know that the earlier search had more than 20 (`more`) |

### Proposal

Attach a **summary of the tool calls** to the previous reply and send it with the next request. This widens what `[Proposal shown]` already does.

The line the LLM reads looks like this. **The server builds it** (step 3 of How it works).

```
[Tools used:
 searchRecruitingQuests board=hobby from=2026-10-20 to=2026-10-26 → found 7 (more: no), shown 3
 resolveFriend "민수" → several: <data label="friend.name">이민수</data> f-1, <data label="friend.name">김민수</data> f-2]
```

**What goes in**
- the tool name
- the search conditions: Board, period, words, place
- the result kind: `found`, `none`, `one`, `several`, `refused`, `proposed`
- the count and `more`, and the **number** of cards shown
- the resolver candidates' names and ids

**What stays out**
- Card ids: they are already in `[Cards shown]`.
- The body of 파티 and events, such as titles and descriptions, for three reasons:
  - It costs many tokens. One search result is thousands of tokens.
  - The data goes stale quickly: recruiting closes, the shuttle moves.
  - Text written by other people piles up in the history, which raises the risk of prompt injection.

**Size**: 20–60 tokens per line. Attached **only to the previous reply**, it adds a few dozen tokens per request. Attached to all 20 messages, it would add up to a few hundred, so it starts with the previous one only.

### How it works

1. **Server → app**: the reply gets a summary field (`toolSummary` or similar). The summary is **a structure, not a string**.
   ```
   toolSummary: [
     { tool: "searchRecruitingQuests", conditions: { board: "hobby", from: "2026-10-20", to: "2026-10-26" },
       result: "found", count: 7, more: false, shown: 3 },
     { tool: "resolveFriend", words: "민수", result: "several",
       candidates: [{ kind: "friend", id: "f-1", name: "이민수" }, { kind: "friend", id: "f-2", name: "김민수" }] }
   ]
   ```
   The server stores nothing, so the app must keep it and send it back. The app does not draw it.
2. **App**: keeps the summary on the reply bubble. With the next request it sends only the summary of **the latest successful reply**. A failure bubble (503, 429) has no summary and is skipped. This is how the last Proposal is sent now.
3. **Server**: checks the summary's size and shape with the request schema (zod). Then `contentOf` **renders** the `[Tools used: …]` line itself, wrapping names written by other people with `othersText`, as `[Proposal shown]` goes through `proposalForModel`.
   - **A string the app sent is never passed to the LLM as it is**, since a client could forge delimiters or instructions.
   - A name the app sent is for display only. When an id is accepted (step 5), the name is replaced by the one read again from the database.
4. **System prompt**: add rules.
   - Follow-ups such as "그중에", "두 번째", "더" refer to the conditions and candidates in `[Tools used]`.
   - The data may be stale, so call the tools again before showing cards.
   - The `[Cards shown]`, `[Proposal shown]` and `[Tools used]` lines are added by the app: **never write them in a reply.** Models readily imitate the format of earlier assistant messages. The server also removes such lines from the reply text.
5. **Which ids are accepted** (the FoundIds rule). This rule is **defined here only**; 3-4 uses it.
   - **The `several` candidate ids of this turn are not put in FoundIds.** If the LLM picks one instead of asking and gives it to `proposeQuest`, the server refuses it. "Never pick for the User" moves from a request in the prompt to something the server enforces. Using them as a search condition is the exception (the place in 3-7).
   - **A resolver id settled as `one` in the previous turn** (a Friend, a Place, an event) is accepted by `proposeQuest` without resolving again, as the ids of `[Proposal shown]` are now.
   - **The `several` candidate ids of the previous turn** are also accepted on the next turn: the previous turn already asked, and the User chose in this one ("이민수", "두 번째"). Friends with the same name can be told apart by the candidates' order or distinguishing details.
   - An accepted id is checked again in the database (it exists, it is published, it is still a Friend). The summary the app sends can be forged, so this check is the condition for accepting it.
   - **Card ids** (파티, events) are not accepted by the presenters. Cards are searched again in this turn and shown up to date.
6. **Scope**: the summary exists only on the previous reply. When another question comes in between, it is gone. For example: turn 1 several → turn 2 a menu question → turn 3 "이민수". That case resolves again, and the summary is not carried over several turns.

### Where to change

- Server
  - `main-server/src/assistant/feature.ts`: keep the tool record during a run (the same record as 2)
  - `adapter.ts`: build the summary, render the line in `contentOf`, remove `[…]` lines from the reply text
  - `dto/assistant-messages.dto.ts`: request and reply schemas, length limits
  - `tools/resolved.ts`, `resolve-*.ts`: keep several out of this turn's FoundIds
  - `tools/propose-quest.ts`: accept ids from the previous summary, check them in the database
  - `chat/chat-assistant.ts`: system prompt
- App
  - `mobile/src/api/assistant-types.ts`, `api/server/assistant-client.ts`: the reply field and its check
  - `features/assistant/use-chat.ts`: keep it on the bubble, put it in `messagesToSend`

### How to check

- **e2e** (a fake model that follows a script)
  - The summary is in the reply.
  - On the next request the model receives `[Tools used]`, with the names wrapped in delimiters.
  - `proposeQuest` refuses this turn's several candidate ids.
  - `proposeQuest` accepts candidate ids from the previous summary.
  - A summary with forged ids (someone who is not a Friend, a Place that does not exist) is refused.
  - A summary too long, or of the wrong shape, is refused.
  - A `[Tools used: …]` line in the reply text is removed.
- **The real effect** is settled only by running a follow-up evaluation set against the real model and comparing (P19 AI metric). A fake model cannot tell whether accuracy improves.

---

## 2. Show tool names and result kinds in the log

### Proposal

One line per turn: which tools were called, in which order, and what they returned. Log it for **both successful and failed turns**.

```
[AssistantService] run: 3 steps · resolveFriend→one, resolvePlace→one | proposeQuest→proposed | answered · tokens in 4120 (cache read 3500, write 0) / out 180
[AssistantService] run: 8 steps · searchRecruitingQuests→none | searchRecruitingQuests→none | … | failed: NoAnswerError
[AssistantService] run: 2 steps · searchRecruitingQuests→found | answered · no cards shown after a search · tokens …
```

`|` is a step boundary; `,` separates tools called together in one step.

### Two levels

| | What is logged | When |
|---|---|---|
| Default | step count, tool names, result kinds (`found`/`none`/`one`/`several`/`refused`/`proposed`/`shown`/error name), candidate counts, how the run ended (answered / cause of failure), anomalies, input and output tokens with cache read and write tokens | Always (the Dev Server included) |
| Debug | Default + **tool inputs** (`resolveFriend("민수")`, search conditions, dates, Proposal fields) | Only with `ASSISTANT_LOG_TOOL_INPUTS=true`. Default `false`. Turned on locally only |

**Why the default level leaves inputs out**: tool inputs hold what the User wrote (`resolveFriend("민수")`, a Proposal's title, …). P07 set the rule "the server's logs never hold what a User wrote", and an e2e test checks it. The default level keeps that rule; leaving it is allowed only where debugging was turned on explicitly.

**Anomalies** (3-6): only those a fixed rule can tell are logged. They are logged only; the LLM is not asked to try again.
- a turn whose search returned `found` but ended without showing cards
- a turn that called the same tool with the same result in a row
- a tool input that does not match its schema (see the implementation notes)

### Cost

- **Tokens: 0.** It logs on the server the record of tools the server itself ran; what is sent to the LLM is unchanged.
- **Log size**: 200–300 bytes per turn. On the Dev Server each service's log is capped at 30MB (10MB × 3), so space is no problem. The cap is shared with other logs, though, so old lines are pushed out that much sooner.

### Implementation notes

- The tool record is gathered in `ToolContext` during the run by wrapping `execute` in `toolSetOf`. Using only the `steps` that `generateText` returns after the run loses the record of a turn that ended in an exception, such as a timeout, and the record of a failed turn is the one most needed.
- **When a tool input does not match its zod schema**, the AI SDK returns a tool-error before it calls `execute`, so a wrapper of `execute` never sees that failure. Add the tool-errors from `onStepFinish` to the record as well. The LLM's malformed inputs are failures the log should show.
- Token counts come from `generateText`'s `usage`. To have them for failed turns too, add them up per step in `onStepFinish`. The cache read and write tokens show whether the caching of 3-2 actually takes effect.
- The tool-call summary of 1 is made from the same record. The record is gathered once and serves both the log and the summary.

### Where to change

- `main-server/src/assistant/adapter.ts`: gather the record, record tool-errors, add up tokens
- `assistant.service.ts`: write the log line
- `main-server/src/common/settings.ts`, `.env.example`: `ASSISTANT_LOG_TOOL_INPUTS`

### How to check

- The existing "no User text in the logs" e2e must keep passing at the default level.
- Add an e2e that the record line is logged for successful and failed turns (steps used up, timeout, an input that does not match its schema).
- Add an e2e that inputs are logged only with the debug flag on.

---

## 3. Improvements adopted (2026-10-20 discussion)

### 3-1. When the intent is ambiguous: show one reading and ask about the other

**Example**: "내일 학관에서 점심" may ask for the menu, or for a meal to be arranged.

**The approach**: show the reading that is useful at once (the lookup), and ask about the other reading in one line.

> (내일 학생회관 점심 메뉴) … 혹시 내일 점심 약속을 잡아 드릴까요? 같이 갈 친구를 알려 주세요.

If the User says yes, the next turn goes on to making a 파티 (multi-turn).

**How "ambiguous" is decided**: "when it is unclear" is itself unclear, so the prompt spells it out:
- When one sentence **reads as a request for two features**, and one of them is a **lookup** (menus, the shuttle, events, finding 파티): do the lookup first, and ask about the other reading in one line.
- When **every** possible reading needs more from the User (for example, whether to find a 파티 or make one): ask at once, without a lookup.
- When one reading is clear, do not ask. For example, "내일 학관 메뉴" is a lookup only, and "내일 학관에서 민수랑 점심" is a Proposal only.

**Where to change**: put the rule and one or two examples in the system prompt of `chat/chat-assistant.ts`. The evaluation's "ambiguous intent" items are graded with this rule as the answer.

### 3-2. Prompt caching: turn the cache on, and move the current time to the end of the system prompt

- **Problem**
  - `adapter.ts` gives no cache option now, so it is not even known whether caching takes effect. That is the first problem.
  - The second line of the system prompt holds the current time (to the minute). A cache reuses only **the identical part from the start**, and for Anthropic models the prefix order is **tools → system → messages**. So the time blocks the cache of **the rest of the system prompt and the messages**. The tool definitions come before the system prompt and are not affected.
  - Within one turn, every step has the same time. Once caching is on, it is reused between steps even now. Moving the time pays off **between requests** (after the minute changes, and across Users).
- **Approach**
  1. Check whether `cache_control` reaches Anthropic models through OpenRouter and the AI SDK. If it is not automatic, put a breakpoint at the end of the fixed part with the AI SDK's provider options.
  2. Put the fixed rules first, and move the current time to **the very end of the system prompt** (or to a separate line before the first message).
  3. Check the minimum cacheable length. Anthropic's documentation gives 512 tokens for Haiku 5.5, so length looks like no problem, but check that the same holds through OpenRouter.
- **Verification**: the cache read tokens in the log of 2 are above 0. If they stay 0, the prefix is changing somewhere.
- **Effect**: lower input cost and latency, and a cheaper evaluation harness too.
- **Where to change**: `chat/chat-assistant.ts` (prompt order), `adapter.ts` (cache options).

### 3-3. The server adds the map buttons by itself

- When `getMenus` returns `found`, the server adds the `dining` button to the reply itself; when `getShuttle` returns `found`, the `shuttle` button.
- Remove the `showOnMap` tool and the system prompt's "after a menu answer, call showOnMap" rule. That leaves 10 tools.
- There is no reason to leave a rule without exceptions to the LLM, and it saves a step.
- **Where to change**: `tools/get-menus.ts`, `tools/get-shuttle.ts` (add the button), delete `tools/show-on-map.ts`, `chat/chat-assistant.ts` (tool list, prompt).

### 3-4. Ask on several, and use what was settled as it is on the next turn

The rule is defined in **step 5 of How it works in 1**. Only its effect is written here.

- **This turn**: several candidate ids do not enter FoundIds, so `proposeQuest` refuses one the LLM picked for the User.
- **Next turn**: ids from the previous summary are accepted. What was settled as `one` is not resolved again, and of several candidates the one the User chose is used.
- **Effect**: in "내일 학생회관에서 민수랑 점심" → (민수 is several, so it asks) → "이민수", turn 2 now calls `resolvePlace("학생회관")` and `resolveFriend("이민수")` again. After the change, turn 2 is a single `proposeQuest`.

### 3-5. The LLM reads the time, the server computes it

Decided 2026-10-21: structured input. The 14-day table and the free-text `resolveTime` tool were considered and not chosen.

- **Problem**: now the LLM turns "내일 점심" into an ISO time, and the server checks only that it is well-formed and not in the past. If the day is miscounted (a weekday, a month boundary), nothing catches it. The LLM knows the current time from the system prompt; what goes wrong is the counting.
- **Approach**: the LLM does not compute dates; it only classifies the User's words into **structured values**. The server computes the date and time with fixed rules.
  ```
  when: {
    day: "today" | "tomorrow" | "dayAfterTomorrow"
       | { weekday: "mon" … "sun", weeksAhead: 0 | 1 | 2 | … }   // 이번 주 0, 다음 주 1, 다다음 주 2
       | { after: { days?: n, weeks?: n } }                       // "3일 뒤", "3주 뒤"
       | { date: "YYYY-MM-DD" },
    time?: "HH:MM" | "breakfast" | "lunch" | "dinner"   // 08:00 / 12:00 / 18:00
  }
  ```
  - The LLM turns a time such as "오후 3시 반" into `15:30`. That is a conversion within one day, with little room for error.
  - Only words that need other data ("축제 끝나고") fall outside the shapes. The LLM asks the User for a day, or, when the words name a date, gives it as `{ date }`.
- **Weeks run from Monday to Sunday.**
  - `weeksAhead: 0` is the week holding today, `1` the week after it, `2` the one after that.
  - So "다음 주 화요일" said on Sunday 2026-10-25 is Tuesday 2026-10-27, the day after tomorrow. Said on Monday 2026-10-26, it is 2026-11-03.
  - A weekday of this week that has passed ("이번 주 월요일" on a Wednesday) is in the past, and is refused as any past time is.
  - `after.weeks: n` is the same weekday n weeks later.
- **Periods** (the search tools, `getMenus` in 3-8) take the same `day` shape for `from` and `to`, or a range name:
  - `thisWeek`: today to this Sunday (as the system prompt says now)
  - `nextWeek`: next Monday to next Sunday
  - `thisWeekend`, `nextWeekend`: Saturday and Sunday of that week; on a Sunday, `thisWeekend` is today only
- **The reply states the date, so that the User can check it.**
  - Every tool that computed a time answers it **with its weekday**, such as `2026-10-27 (화) 12:00`, or `2026-10-27 (화) – 2026-11-02 (일)` for a period.
  - The system prompt tells the LLM to state that date and weekday in the reply, in the server's words, never its own counting: "10월 27일 (화) 12시로 제안했어요", "10월 27일 (화)부터 11월 2일 (일)까지 찾아봤어요".
  - This changes the current rule for Proposals, "do not repeat the fields": the date and weekday are the one field the reply repeats.
  - A different reading of "다음 주" by the User is then seen at once and corrected in the next message ("아니 이번 주 금요일").
- A result in the past is `refused` with the reason, as now.
- **Why not a `resolveTime(words)` tool that takes free text**
  - Korean relative time expressions ("다다음 주 화요일 저녁 7시 반쯤") have no end, so a server parser would keep growing.
  - A separate tool adds a step to every Proposal, spending again the step 3-3 saved.
- **Scope**: `proposeQuest.startsAt`, the periods of `searchRecruitingQuests`, `searchGlobalEvents` and `resolveGlobalEvent`, and `getMenus` (3-8). They share one type and one computing function.
- This changes the P07 spec's decision "the model converts times", so that line of `.scratch/iteration-2/P07-ai-activity-chat/spec.md` changes with it.
- **Where to change**: `korea-time.ts` (the computing rules) or a new file beside it, the tools above, `chat/chat-assistant.ts`.

### 3-6. On a failure, ask the User or give a fixed answer, never "try again"

- Keep the current structure, in which the User is asked at once when `proposeQuest` refuses. Nothing new is built.
- Anomalies are only **logged** in the log of 2 ("Anomalies" in 2). No step asks the LLM to fix and try again.
- **Why**:
  - A retry is one more model call billed to the credit and more waiting for the User, within the same 8 steps and 30 seconds. This is the reasoning behind `MAX_RETRIES = 0` in `adapter.ts`.
  - A model told that its call was wrong tends to force some other answer rather than admit what it does not know. Asking the User, or a fixed answer, leaves the decision with the User.
  - Whether a retry would help is measured with P19, not assumed. The anomaly log shows how often such turns happen.

### 3-7. Words and place conditions for the 파티 search, and guidance on `more`

**Question: if the server filters by words, are similar words that are not exactly the same left out?**

Yes. The event search's `words` is **substring matching** too (`searched` in `global-events.service.ts`), so searching "러닝" leaves out a "달리기" recruiting post. So words are used **as a priority, not a filter**.

- **Words (`words`)**
  - The LLM gives up to 5, synonyms included (for example 러닝, 달리기, 조깅). The prompt and the tool description say "include similar words".
  - The server returns the 파티 that match the words **first**, then fills the rest in order of start time, up to 20. Each candidate carries `matched: true/false`.
  - This fixes matches buried past the 20th, and different words are no longer left out. The final judgement stays with the LLM reading the titles and descriptions, as now.
- **Place**: not compared as text. Get the Place id with `resolvePlace` first, then filter the 파티 whose next meeting is at that Place. It is an exact match, so similar words are no problem.
  - The search takes a `placeIds` **array**. When `resolvePlace` returns `several`, it does not ask, and filters by all the candidates. Unlike a Proposal, a broad search does no harm, and the conversation is one turn shorter.
  - So several candidate ids are **accepted by the search and refused by `proposeQuest`** (step 5 of How it works in 1). FoundIds must mark "ids from several" separately.
- **People**: add the **capacity** (`capacity`) to the candidates, and an optional condition `minPlacesLeft` (the fewest places left). It is a number comparison, so it is exact.
- **When `more: true`**: add a prompt rule: "say that more 파티 match, and suggest narrowing down by time of day, Board or words".
- Finding by member ("민수 있는 파티") is left out. It would give members' information to the AI, so the privacy scope must be decided first.
- **Where to change**: `tools/search-recruiting-quests.ts`, `quests/recruiting.service.ts` (ordering and the place condition), `found-ids.ts` (marking several), `chat/chat-assistant.ts`.

### 3-8. getMenus also takes a date range

- It takes one of two inputs:
  - **One day**: one `date` ("오늘", "내일", "모레", "금요일"). It returns that day's menus only.
  - **A range**: `from` and `to` ("이번 주", "주말", "월요일부터 수요일까지"). It returns the menus of each day in the range, in date order.
- A range is at most 7 days. A day without menus is marked "none" for that day.
- The meal and restaurant conditions apply to both, as now.
- Dates are taken in 3-5's `day` shape and range names, and the answer gives each day with its weekday.
- **Effect**: "이번 주 학식" no longer calls `getMenus` 7 times and runs past the 8 steps.
- **Where to change**: `tools/get-menus.ts`, `menus/menus.service.ts` (range lookup).

