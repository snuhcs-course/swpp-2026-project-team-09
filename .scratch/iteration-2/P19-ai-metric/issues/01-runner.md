# 01: The runner: real model runs of the Assistant, recorded

Parent: [P19 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A developer runs `pnpm eval` in the main server and the Assistant answers benchmark cases through the real model, inside the app started the way the e2e tests start it, on a fixed world and a fixed clock (2026-10-21 14:05 KST). Every turn is recorded: each step's tool calls and inputs, the tool results where the tools produced them, the finish reason and the usage (input, output, cache read and cache write tokens), and the reply's full text and length, or the failure (STEP_LIMIT, TIMEOUT, ERROR). The run is saved as raw JSON for the scorer (ticket 02).

The server's code and its replies stay as they are: the recorder wraps the model, and the hyperparameters come from the command line, so the team can run experiments with different models, sampling settings and limits without touching code. See the spec's "Where it lives and how it runs", "The recorder" and "Cost".

## Acceptance criteria

- [ ] `pnpm eval` runs a Vitest project of its own; `pnpm test` and CI never run it and never call OpenRouter.
- [ ] The app is started with the real OpenRouter model (the team's current key from `.env`) wrapped by a recorder, the clock fixed at 2026-10-21T14:05+09:00, and the daily message limit raised for the run.
- [ ] Requests go through `POST /assistant/messages` as the app sends them, as one seeded User.
- [ ] A turn's trace holds every step's tool calls with inputs, the tool results, the finish reason and the usage with cache tokens, then the HTTP status and the reply with its full text and length, or the failure kind: STEP_LIMIT (the step cap ended on tool calls), TIMEOUT or ERROR.
- [ ] Tool results are recorded where they are produced (each tool's `execute` wrapped in the eval's app, and the step callback for tool errors), not read from the next step's prompt, so a STEP_LIMIT trace keeps its last step's results.
- [ ] Three kinds of case run: single turn; fixed history (earlier turns written in the case as structured values — user text, assistant text, cards by seed name, Proposal — and turned into the request body; only the last turn is the scored one); live (every turn sent to the model, later user messages fixed, stopping at the first turn the case marks as failed once scoring exists).
- [ ] Hyperparameters on the command line, each defaulting to the measured branch's settings (never hard-coded 8 steps / 30 s) and recorded in the run: `--model`, `--temperature`, `--top-p`, `--max-steps`, `--timeout`, `--max-output-tokens`, `--repeat`. Sampling settings go through the model wrapper; limits through the settings given to the app. No server file changes.
- [ ] `--category` and `--case` choose what runs; cases marked `repeat: 3` run three times.
- [ ] Before a run the estimated cost is shown and confirmed (`--yes` skips the question); during a run the spent tokens are summed and the run stops past `--budget` (default USD 5, from estimated prices), saving what it has; the hard stop, if wanted, is a credit limit on the OpenRouter key.
- [ ] A run is saved as JSON named by date, commit, model and settings, with every turn's trace; `results/` is ignored by git.
- [ ] A sample world (enough for one menu case) and one sample case in the case format run end to end against the real model.
- [ ] Tests with ScriptedModel in place of the real model: the trace holds the steps, tool results and usage; a run that ends on the step cap is STEP_LIMIT and keeps its last step's tool results; the hyperparameter values reach the model call and the run limits.

## Comments
