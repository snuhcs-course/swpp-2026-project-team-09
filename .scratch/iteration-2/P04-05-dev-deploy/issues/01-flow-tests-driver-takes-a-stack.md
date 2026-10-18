# 01: The flow-tests stack driver can start a second stack

Parent: [P04-05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)
Touches: flow-tests' shared test modules (the stack driver and the global setup). Nothing else.

## What to build

A test in `flow-tests` can start a Compose stack other than the flow stack: its own project name, its own Compose files and its own settings file, through the same driver the flows use. The driver's `docker compose` wrapper takes a description of the stack and defaults to the flow stack, so every existing flow runs unchanged. The parts of the global setup that make a stack's settings file (the ES256 key pair, the Google key, the tokens, the passwords) become a function that writes such a file into a folder of the caller's choice, and the global setup calls it for the flow stack. This is the prefactoring that ticket 02 builds on; it adds no new behaviour to the flows.

## Acceptance criteria

- [ ] `pnpm test` in `flow-tests` passes with every existing flow unchanged, and `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass.
- [ ] A caller can run `docker compose` against a project of another name, with other Compose files and another settings file, through the driver; the flow stack remains the default when nothing is passed.
- [ ] A caller can write a complete settings file for a new stack into a folder it names, with the same generated values the flow stack gets.
- [ ] The flow stack's Compose test override and its project name are unchanged.
- [ ] Each changed source file gets a new row in its AI-generated box (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
