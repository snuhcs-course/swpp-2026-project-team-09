# 01: The flow-tests stack driver can start a second stack

Parent: [P04-05 spec](../spec.md)
Status: done
Blocked by: None (can start immediately)
Touches: flow-tests' shared test modules (the stack driver and the global setup). Nothing else.

## What to build

A test in `flow-tests` can start a Compose stack other than the flow stack: its own project name, its own Compose files and its own settings file, through the same driver the flows use. The driver's `docker compose` wrapper takes a description of the stack and defaults to the flow stack, so every existing flow runs unchanged. The parts of the global setup that make a stack's settings file (the ES256 key pair, the Google key, the tokens, the passwords) become a function that writes such a file into a folder of the caller's choice, and the global setup calls it for the flow stack. This is the prefactoring that ticket 02 builds on; it adds no new behaviour to the flows.

## Acceptance criteria

- [x] `pnpm test` in `flow-tests` passes with every existing flow unchanged, and `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass.
- [x] A caller can run `docker compose` against a project of another name, with other Compose files and another settings file, through the driver; the flow stack remains the default when nothing is passed.
- [x] A caller can write a complete settings file for a new stack into a folder it names, with the same generated values the flow stack gets.
- [x] The flow stack's Compose test override and its project name are unchanged.
- [x] Each changed source file gets a new row in its AI-generated box (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### What ticket 02 builds on (2026-10-17)

- `test/stack.ts`: a `Stack` is `{ project, files, settings }`, where `files` are relative to the repository root and `settings` is the folder whose `compose.env` is the `--env-file`. `compose(stack, ...args)` runs on that stack, and `compose(...args)` on `FLOW_STACK`. `startStack(stack)` removes what an interrupted run left, runs `up --build --wait` (printing the logs on failure) and answers the function that takes the stack down with its volumes. `published(stack, service, port)` answers the loopback address of a published port.
- `test/settings.ts`: `writeSettings(folder, values)` writes `compose.env` (the ES256 key pair and the two tokens, then the caller's values, which win on a shared name) and `tls/` (the sources container's certificate and Google's public key), and answers Google's private key. It does not empty the folder first.
- The current global setup makes no passwords: the base `compose.yaml` fixes the laptop ones. The deploy-only values (`POSTGRES_PASSWORD`, `MAIN_DB_PASSWORD`, `MATCH_DB_PASSWORD`, `DEPLOY_STATUS_DIR`, `DEPLOY_APK_DIR`, `COMPOSE_PROFILES`, …) are the caller's `values`.
- `test/stack.flow.ts` checks both through `docker compose config` on a one-service probe project, without starting a second stack. It is named `.flow.ts` because the vitest config runs only that pattern.
- `flow-tests/README.md`'s folder layout still describes `global-setup.ts` as making the keys and lists neither `settings.ts` nor `stack.flow.ts`; the README was outside this ticket's files.

### Agent usage (2026-10-17)

- Agent time: about 11 minutes, an estimate: the implementer subagent and the subagent that merged its branch.
- Tokens: input 6,322,000 in all (cache reads 6,115,000, cache writes 207,000, uncached under 1,000); output about 20,000 (estimated from what the transcripts hold, which keep only partial output counts, so a lower bound).
- The orchestrating session, the code review and its fix round are shared by tickets 01–05 and recorded once, under ticket 05.
