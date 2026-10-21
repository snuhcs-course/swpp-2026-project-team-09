# P19: AI metric, a benchmark of the Assistant's agentic performance

Status: ready-for-agent

## Problem Statement

The Assistant (P07) answers through a real model that picks tools, reads their results and decides what to show. Its e2e tests run a ScriptedModel (`main-server/test/scripted-model.ts`): a person writes which tool the model calls at each step, so the tests prove that the server's checks, guards and replies are right, and say nothing about whether the real model chooses those steps. The P07 tickets left that open on purpose and handed it here: does the model ask back when a name matches several Friends, call `showOnMap` after a menu answer, apply 08:00/12:00/18:00 for 아침/점심/저녁, call every resolver before `proposeQuest`, map 운동 to the hobby Board (P07 `spec.md` lines 163, 240, 252; tickets 03–07, "Not checked").

The team also has a list of improvements to the Assistant (`references/ai-chat-improvement.md`), each of which should stay only if it measurably helps. There is no way to measure today, and runs of the Assistant fail fairly often on its step limit (the mid-iteration check-in, 2026-10-18), with no number for how often.

## Solution

A benchmark that puts a fixed set of about 50 cases to the real model, through the real server code, and scores what the model did with fixed rules. One manual command runs it and prints a scorecard: how often the model took the right kind of action (look something up, ask back, propose, refuse, chat), whether it called the right tools with the right arguments, how often it called too many or too few, how often a run failed and why, and what it cost. A change to the prompt, a tool or the model is kept when the scorecard says it helped.

It runs inside `main-server/eval/` on the same machinery as the e2e tests: the app started in-process with `startApp`, a fresh Postgres and Redis, a fixed world seeded into them, the clock fixed at 2026-10-21 (수) 14:05 KST, and the OpenRouter model in place of the ScriptedModel. A recording wrapper around the model sees every step, so the server's code and replies stay as they are.

The benchmark measures the Assistant as it is built today (`2.0/Main`), and is built so that the improvements in `references/ai-chat-improvement.md` need only small edits to it (see "Staying valid when the Assistant changes").

Words: a **case** is one scenario with its expected behaviour; a **turn** is one user message and the Assistant's reply; a **run** is one pass over the chosen cases; the **trace** is what the model did in a turn (its steps, tool calls, tool results, usage).

## User Stories

### Running it

1. As a developer, I want one command (`pnpm eval`) that runs the benchmark against the real model, so that I measure the Assistant as Users meet it.
2. As a developer, I want the benchmark never to run in CI or in `pnpm test`, so that no push spends credit.
3. As a developer, I want to run only some categories or cases (`--category`, `--case`), so that I pay only for what my change touches.
4. As a developer, I want to set the model and its hyperparameters on the command line (`--model`, `--temperature`, `--top-p`, `--max-steps`, `--timeout`, `--max-output-tokens`, `--repeat`), so that I can run experiments without changing code.
5. As a developer, I want the run to show its estimated cost and ask before it starts, and to stop at once when the tokens spent pass a cap, so that a run can never drain the credit the app's Users share.
6. As a developer, I want each case to run against the same seeded world and the same fixed time, so that a case's right answer never changes from one day to the next.

### What it scores

7. As a developer, I want each turn classified as TOOL, ASK, PROPOSE, REFUSE or CHAT from what the model did, so that I see whether it chose the right kind of action, which outcome-only scoring hides.
8. As a developer, I want a case to accept more than one right behaviour (for example ASK, or a lookup followed by a question), so that a reasonable answer is not marked wrong.
9. As a developer, I want the reply checked by its outcome (the Proposal's fields, the cards shown, the map buttons, words the text must hold), so that a different but right way to get there still passes.
10. As a developer, I want the tools checked as "must call at least these" and "must not call these", with extra calls counted separately as over-calling, so that a harmless extra lookup does not fail a case.
11. As a developer, I want tool arguments compared after normalising them (dates, Boards, the words passed to a resolver), so that a format change in a tool means one edit, not fifty.
12. As a developer, I want a run that hits the step limit, the timeout or an error recorded as its own failure kind, so that I can see how often the Assistant fails on the step limit.
13. As a developer, I want follow-up cases to give the earlier turns as a fixed conversation and score only the last turn, so that a case does not branch on what the model said first.
14. As a developer, I want a few cases run live over several turns, where the first reply leaves only one path, so that I also see the model carry a conversation on its own.
15. As a developer, I want a handful of cases run three times each and reported as pass^3, so that I see how steady the model is without paying three times for every case.

### Reading the result

16. As a developer, I want a scorecard with action recall by kind, tool selection and argument accuracy, over- and under-calling, results by category, failure kinds, pass^3 on the repeated set, average steps, latency and tokens (cache reads included), so that I can judge a change at a glance.
17. As a developer, I want every failed case listed with its trace, so that I can see why it failed.
18. As a developer, I want a run saved as raw JSON and as a Markdown scorecard named by date and commit, and two runs compared side by side, so that I can keep a change only if it helped.
19. As a team, I want to run the experiments ourselves and keep the runs we choose, so that later changes are measured against a run we trust.

### Trusting it

20. As a developer, I want the scorer and the case files tested with recorded traces in the normal test suite, so that a wrong rule or a broken case file is caught for free.
21. As a reviewer, I want all cases in one readable file set reviewed in one pull request, so that the team agrees on what "right" means before the numbers count.

## Implementation Decisions

### Where it lives and how it runs

- `main-server/eval/`, its own Vitest project (`eval`) excluded from `pnpm test`, started by a `pnpm eval` script that passes the options on. It reuses `test/global-setup.ts` (containers, migrations, the Places seed) and `test/start-app.ts`.
- `startApp(settings, …, model)` receives the real model: `openRouterModel(OPENROUTER_API_KEY, model)` from `src/assistant/adapter.ts`, wrapped by the recorder (below). Settings: the team's current OpenRouter key from `main-server/.env` (decided: no separate key), `ASSISTANT_DAILY_MESSAGES` raised high enough for a run, the other limits as in production (8 steps, 30 s, 1000 output tokens, history 20).
- The clock: `CLOCK.now` fixed to 2026-10-21T14:05+09:00 for the whole run.
- Requests go through `POST /assistant/messages` as the app sends them, as one seeded User.
- Hyperparameters come from the command line and change nothing in the server: the model id and sampling settings (`--temperature`, `--top-p`) are applied by the model wrapper, and the run limits (`--max-steps`, `--timeout`, `--max-output-tokens`) by the settings given to `startApp`. Left out, each takes production's value: the model in `ASSISTANT_MODEL`, the provider's default sampling (production passes none, so 1.0), 8 steps, 30 s, 1000 tokens. Every run records the values it used. Changing production's values is a separate decision, taken from what the experiments show. Whether Haiku 5.5 accepts a temperature in every mode is checked against Anthropic's documentation when it is built.

### The recorder (the trace)

- The server keeps only the final text and what the presenters added (`adapter.ts`), and the reply carries no trace. The benchmark does not change that. It wraps the model (an AI SDK language-model middleware, the way `ScriptedModel` records `doGenerateCalls`) and records, per step: the tool calls with their inputs, the tool results the server returned (read from the next step's prompt, as ScriptedModel's tests read them), the finish reason and the usage (input, output, cache read and cache write tokens).
- A turn's trace ends with the HTTP status and the reply body (`text`, `cards`, `mapButtons`, `proposal`), or the failure: 503 is classified by the recorded steps as STEP_LIMIT (the last step ended on tool calls at the step cap), TIMEOUT or ERROR.

### The fixed world

- A seed written for the benchmark (`main-server/eval/world.ts`), using the e2e helpers (`signInUser`, `befriend`, `storeEvent`, `ownQuest`/`makeQuest`, `sendAsWorker` with menus and shuttle messages) and the shared Places seed. Not the demo seed, which may change for demos.
- It holds what the cases need, at least:
  - the asking User and Friends 이민수, 김민수 (two Friends match "민수"), a pair with the same name, and a Friend with a unique name;
  - Places 학생회관 (63동) and 301동 from the shared seed;
  - Global Events in the week of 2026-10-21 of several kinds, one that ended, none on a day used for "no data" cases;
  - recruiting Quests on several Boards (hobby with a 운동 one, meal, study), some full or ended;
  - menus for 2026-10-21 and 10-22 with breakfast, lunch and dinner, none for a day used for "no data";
  - shuttle stops and vehicles.
- Every right answer in the cases refers to this seed. The seed and the cases change together.

### Cases

- YAML files under `main-server/eval/cases/`, one per category, about 50 cases in the first version, all written by hand (rephrased variants come later). Each case has an `id`, a `category`, `turns` and `expect`, and may be marked `repeat: 3` (the repeated set, about 5 cases).
- Kinds of turns:
  - **Fixed history** (most follow-ups): earlier turns are written in the case as the app would send them — user text, and assistant turns as structured values (`text`, `cards: [{kind, id-by-seed-name}]`, `proposal`) — and turned into the request body by the harness. Only the last turn is scored.
  - **Live** (3–5 cases): every turn is sent to the model; each later user message is fixed; the case stops at the first turn that fails. Only cases whose first reply leaves one right path are written this way (for example "내일 점심 학생회관에서 이민수랑 밥 약속 잡아줘" → a Proposal, then "7시로 바꿔줘" → the changed Proposal).
- `expect` per scored turn:
  - `actions`: the accepted behaviours, one or more of TOOL, ASK, PROPOSE, REFUSE, CHAT, or a combination such as `TOOL+ASK`;
  - `tools.required`: tools that must be called at least once; `tools.forbidden`: tools that must not be (`"*"` for none);
  - `args`: expected normalised arguments of named tools;
  - outcome checks: `proposal` fields, `cards` (kind and seed names, count limits), `mapButtons`, `text.mentions` (words the text must hold, such as both candidates' names or that nothing was found).
- Categories and rough counts for the first version (56 in all):

| Category | Right behaviour | Cases |
|---|---|---|
| Menus | TOOL with the right day and meal; dining button | 5 |
| Shuttle | TOOL; shuttle button | 3 |
| Global Events | TOOL with the right period and words; event cards | 5 |
| Finding 파티 | TOOL on the right Board and period; at most 3 cards for "파티 찾기" | 5 |
| Making 파티 | PROPOSE with the right fields (time defaults, place, invitees, closed or open) | 7 |
| Missing or ambiguous target | ASK naming the candidates or the missing fields in one question | 7 |
| Ambiguous intent | ASK, or TOOL+ASK (see below) | 4 |
| No data | TOOL, and the text says there is none | 4 |
| Can't do / out of scope | REFUSE: reports, code, library seats, where a Friend is | 4 |
| Small talk | CHAT, short, no tools; a meal recommendation asks the taste first | 3 |
| Follow-ups (fixed history) | the right action on the earlier turns: "이민수" after an ask, "두 번째 거", "7시로 바꿔줘" | 6 |
| Live multi-turn | as above, from the first turn | 3 |

- The P07 open questions each get at least one case: map buttons after menus and shuttle; picking among event candidates; 운동 → hobby Board and at most 3 cards; 08/12/18 defaults; every resolver before `proposeQuest`, asking on `several`.
- Ambiguous intent ("내일 학관에서 점심": menus, or a meal with someone?): both ASK and TOOL+ASK are accepted today, since the prompt has no rule for it. When improvement 3-1 is adopted, those cases accept TOOL+ASK only.
- Prompt injection and other security cases are out of this benchmark (they are handled separately).

### Scoring (rules only)

- The action of a turn is read from its trace and reply:
  - PROPOSE: the reply carries a `proposal`;
  - TOOL: a lookup or presenter tool returned `found`/`shown`, and the reply carries cards or map buttons, or a lookup returned `none` and the text says so;
  - ASK: no Proposal, and either a resolver returned `several`/`none` or `proposeQuest` returned `refused`, or the text ends in a question; for a case that names `text.mentions`, those words must be there too;
  - REFUSE: no tool calls, on a case marked as one to refuse;
  - CHAT: no tool calls, on a small-talk case;
  - a combination when both parts hold (TOOL+ASK: TOOL's condition and the text asks a question).
- A turn passes when its action is one of `actions` and every other check in `expect` passes. A case passes when all its scored turns pass.
- Argument checks go through one normaliser per tool (`main-server/eval/normalise.ts`): dates to `YYYY-MM-DD` in Korea, times to `HH:MM`, resolver words trimmed, Boards by name. Tool results are read through the same file.
- Over-calling: calls to tools outside `required` that the case did not need, and calls to `forbidden` tools. Under-calling: a `required` tool not called.
- No model grades anything. Tone ("해요체", brevity) is left out of this version.

### The scorecard

- `main-server/eval/results/<YYYY-MM-DD>-<commit>-<model>-<settings>.json` (every turn's trace, the checks and their results) and a `.md` beside it with:
  - action recall per kind (TOOL, ASK, PROPOSE, REFUSE, CHAT), the headline;
  - tool selection accuracy, argument accuracy, over-calling and under-calling rates;
  - pass rate per category, with ambiguous intent shown apart;
  - failure kinds (STEP_LIMIT, TIMEOUT, ERROR) per category;
  - pass^3 on the repeated set;
  - average steps, average latency, tokens in (cache reads, cache writes) and out, and the estimated cost;
  - the failed cases, each with its trace.
- `pnpm eval:compare <a.json> <b.json>` prints the two scorecards side by side with the differences.
- Results stay local (`results/` is ignored); the team commits the runs it wants to keep. A saved raw run can be scored again without calling the model.

### Cost

- Before a run: the estimated cost from the number of turns and a per-turn estimate (refined from the last run's average), and a confirmation prompt (skippable with `--yes`).
- During a run: tokens are summed from the recorded usage; past the cap (`--budget`, default USD 5 at OpenRouter's price for the model) the run stops and saves what it has.
- A first run of 5 cases measures the real cost per turn before a full run.
- The team's current key is used, and it is the same credit as the Users' chat: the cap is the protection.

### Staying valid when the Assistant changes

The improvements in `references/ai-chat-improvement.md` change the Assistant's behaviour. The benchmark is built so that each needs only a small edit:

| Improvement | Edit to the benchmark |
|---|---|
| 1. Tool summary of the previous turn (`[Tools used]`) | add `toolSummary` to fixed-history assistant turns |
| 2. Tool log | none (the recorder stays; the log may replace it later) |
| 3-1. Ambiguous intent: show one side, ask the other | ambiguous-intent cases accept TOOL+ASK only |
| 3-2. Prompt caching, time at the end | none; cache tokens are already reported |
| 3-3. Map buttons added by the server, `showOnMap` removed | none, since map buttons are checked as an outcome; drop `showOnMap` from any `required` |
| 3-4. Confirmed ids reused on the next turn | drop resolvers from `required` on those follow-ups |
| 3-5. Times as structured values | one edit to the normalisers |
| 3-7. Search by words and Places | one edit to the normalisers; new cases if wanted |
| 3-8. Menus over a range | none, checked as an outcome |

### Tickets

1. The runner: `pnpm eval`, the real model behind the recorder, the fixed clock, single-turn, fixed-history and live cases, the command-line hyperparameters, case and category selection, the cost guard, raw traces saved; proven on a sample world and one sample case.
2. The scorer: actions, tool and argument checks, outcome checks, failure kinds, pass^3, the Markdown scorecard and the comparison; tested in CI with hand-made traces.
3. The dataset: the full fixed world and the 56 cases, in one pull request for the team to review, with the schema and seed-name checks in CI and a 5-case trial run.

Running the experiments (models, temperatures, limits) is left to the team.

## Testing Decisions

- The scorer is tested without a model: recorded or hand-written traces for each action kind, combinations, failure kinds, argument normalisation and outcome checks, in a Vitest project that runs in CI.
- Every case file is loaded and checked against the case schema in CI, and every seed name a case refers to must exist in the world seed.
- The hyperparameter flags are tested with ScriptedModel: the values given reach the model call (ScriptedModel reads its call options) and the run limits.
- The recorder is tested with ScriptedModel standing in for the real model: the trace holds the steps, tool calls, tool results and usage, and a run that hits the step cap is classified STEP_LIMIT.
- The real-model run is not part of any automated test.

## Out of Scope

- Prompt injection and security cases (handled separately).
- Grading by a model (tone, brevity); rephrased variants generated by a model; growing the set to 150–200 cases.
- Making any of the improvements in `references/ai-chat-improvement.md`; P19 only measures.
- Running the benchmark in CI or on a schedule.
- Running the experiments and changing production's model, temperature or limits; the team runs them with the flags.
- Production logging of tool calls (improvement 2).

## Further Notes

- References: `references/eval-harness-plan.md` (the plan this spec settles) and `references/ai-chat-improvement.md` (the improvements it will measure), copied from the team's documents on 2026-10-21.
- Grounding for the method: τ-bench (Yao et al., 2024) reports pass^k for consistency, measured by repeating a task with only the model's sampling varying; BFCL (Berkeley Function Calling Leaderboard) scores multi-turn calls by whether the essential calls are present, allowing extra ones. The plan's reference to a "Calibration" paper (arXiv 2609.00949) is unverified (the improvements document says so too) and is not used here.
- With about 50 cases, one case is about 2 percentage points of the whole set and 15–35 points of a category of 3–7 cases; small differences between runs are noise. The repeated set and the comparison view are there to keep that in mind.
