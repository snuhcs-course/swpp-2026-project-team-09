# 01: The runner: real model runs of the Assistant, recorded

Parent: [P19 spec](../spec.md)
Status: ready-for-human
Blocked by: None (can start immediately)

## What to build

A developer runs `pnpm eval` in the main server and the Assistant answers benchmark cases through the real model, inside the app started the way the e2e tests start it, on a fixed world and a fixed clock (2026-10-21 14:05 KST). Every turn is recorded: each step's tool calls and inputs, the tool results where the tools produced them, the finish reason and the usage (input, output, cache read and cache write tokens), and the reply's full text and length, or the failure (STEP_LIMIT, TIMEOUT, ERROR). The run is saved as raw JSON for the scorer (ticket 02).

The server's replies stay as they are: the recorder wraps the model, one small seam (an optional run observer) reports tool results, and the hyperparameters come from the command line, so the team can run experiments with different models, sampling settings and limits without touching code. See the spec's "Where it lives and how it runs", "The recorder" and "Cost".

## Acceptance criteria

- [x] `pnpm eval` runs a Vitest project of its own; `pnpm test` and CI never run it and never call OpenRouter.
- [x] The app is started with the real OpenRouter model (the team's current key from `.env`) wrapped by a recorder, the clock fixed at 2026-10-21T14:05+09:00, and the daily message limit raised for the run.
- [x] Requests go through `POST /assistant/messages` as the app sends them, as one seeded User.
- [x] A turn's trace holds every step's tool calls with inputs, the tool results, the finish reason and the usage with cache tokens, then the HTTP status and the reply with its full text and length, or the failure kind: STEP_LIMIT (the step cap ended on tool calls), TIMEOUT or ERROR.
- [x] `runFeature` takes an optional run observer, called with each tool's name, input, and result or error, and with each step's end; production passes none and behaves as before, and the eval provides one through Nest's injection. Tool results are recorded through it, not read from the next step's prompt, so a STEP_LIMIT trace keeps its last step's results.
- [x] Three kinds of case run: single turn; fixed history (earlier turns written in the case as structured values — user text, assistant text, cards by seed name, Proposal — and turned into the request body; only the last turn is the scored one); live (every turn sent to the model, later user messages fixed, stopping at the first turn the case marks as failed once scoring exists).
- [x] Hyperparameters on the command line, each defaulting to the measured branch's settings (never hard-coded 8 steps / 30 s) and recorded in the run: `--model`, `--temperature`, `--top-p`, `--max-steps`, `--timeout`, `--max-output-tokens`, `--repeat`. Sampling settings go through the model wrapper; limits through the settings given to the app. No server change beyond the observer seam. The `development` limits (30 steps / 60 s) are measured with `--max-steps 30 --timeout 60000`.
- [x] `--category` and `--case` choose what runs; cases marked `repeat: 3` run three times.
- [x] Before a run the estimated cost is shown and confirmed (`--yes` skips the question); during a run the spent tokens are summed and the run stops past `--budget` (default USD 5, from estimated prices), saving what it has; the hard stop, if wanted, is a credit limit on the OpenRouter key.
- [x] A run is saved as JSON named by date, commit, model and settings, with every turn's trace; `results/` is ignored by git.
- [ ] A sample world (enough for one menu case) and one sample case in the case format run end to end against the real model.
- [x] Tests with ScriptedModel in place of the real model: the trace holds the steps, tool results and usage; a run that ends on the step cap is STEP_LIMIT and keeps its last step's tool results; the hyperparameter values reach the model call and the run limits.

## Comments

### Runner built (2026-10-22)

Built on `2.0/P19-01-runner`. Everything is in place and tested with the ScriptedModel in `pnpm test`
(`test/eval-runner.e2e-spec.ts`, `test/eval-options.e2e-spec.ts`), except the one criterion left open: the sample
case has not been run against the real model, because a run spends the team's OpenRouter credit and needs a person's
go-ahead. Status is `ready-for-human` for that one run: put the key in `main-server/.env`, then
`pnpm eval --case menus-today-lunch` (it shows the estimated cost and asks first), and tick the box once a run is saved
under `eval/results/`.

- Observer seam: `runFeature(model, feature, asker, messages, limits, observer?)` in `src/assistant/adapter.ts`, with
  `RunObserver { toolEnded({ callId, name, input, result | error }); stepEnded({ finishReason, inputTokens,
  outputTokens, cacheReadTokens, cacheWriteTokens }) }`. `AssistantService` injects `RUN_OBSERVER` with `@Optional()`;
  only the benchmark binds it (`eval/run-observer.module.ts`, a global module passed to `startApp`'s new `modules`
  parameter). Without one, the tools' `execute` and `generateText`'s options are as before.
- `--repeat <n>` sets how many times the cases marked `repeat` run; left out, each runs its own count.
- `--category` and `--case` together run the union of both.
- The estimated prices come from OpenRouter's public list of models (no key sent); a model not in it gets fallback
  prices of USD 5 / 25 per million tokens, and the CLI says so.
- Live cases accept an `expect` per User turn, and `runCase` takes a `passed` callback for the scorer (ticket 02) to
  stop a live case at its first failed turn.
- Added the `yaml` dev dependency (already in the lockfile through Vitest).

### Agent usage (2026-10-22)

- Agent time: about 1 hour (estimate), the runner subagent's session in its worktree.
- Tokens (estimate, this session only): about 7.5M input, of which about 7.2M cache reads and 0.25M cache writes,
  and about 60k output. No subagents.
