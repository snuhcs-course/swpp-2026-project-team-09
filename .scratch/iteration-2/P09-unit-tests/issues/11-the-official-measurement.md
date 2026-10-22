# 11: The official measurement

Parent: [P09 spec](../spec.md)
Status: ready-for-human
Blocked by: P09-02 (main-server: tests named by level, run and measured apart), P09-03 (match-server, socket-server and worker-server: tests named by level, run and measured apart), P09-04 (admin: tests named by level, run and measured apart), P09-05 (mobile: tests named by level, run and measured apart), P09-06 (flow-tests: flows named by level), P09-07 (Settings schemas and main-server's pure logic as units), P09-08 (match-server's round split and assign, and socket-server's token check, as units), P09-09 (admin's main-server client, sign-in path check and health answer as units), P09-10 (mobile's renewal edge cases, answer checks and pure adapters as units), P10-01 (The event flow waits for the Shared Quest), P10-02 (Refusal tokens that differ in one property, and a request withdrawn during a round), P11-01 (A1 and A2: a Session replaced, and a Leader running a group, in flow-tests), P11-02 (W1 and W2: the admin site in a browser against the flow stack), P11-03 (M1 and M2: the app on an Android emulator against its mock data)
Touches: the P09 spec's Results section only. No code, test or configuration.

## What to build

A person runs the measurement once, at the final commit of `2.0/Main` after all P9, P10 and P11 work has merged, on the measurement Mac (P09 spec, "The official measurement"). Its numbers replace the survey figures and go into the spec's Results section, against the coverage goals that were declared and merged before the run.

In every package except flow-tests the run is `pnpm test:cov:unit` and `pnpm test:cov`; in flow-tests, `pnpm test` and `pnpm test:admin-ui`; in mobile, `pnpm build:mock-apk` at that commit and then `pnpm test:device` on the pinned emulator, cold-booted (P11 spec, "M1 and M2: the emulator and Maestro").

The Results read each figure for what it is: unit-only coverage beside whole-suite coverage, the tests of test tooling counted apart from the product's, and the branch figures explained (P09 spec, "Reporting").

## Acceptance criteria

- [ ] Every command above ran at one commit, the final commit of `2.0/Main` after every ticket above merged, and the Results name that commit and the date and time in KST.
- [ ] The Results record the measurement Mac's model, chip and memory, and the versions of macOS, Node (the `.nvmrc` pin), pnpm 12.6.0, Docker, Java, Playwright and its Chromium build, Maestro, and the emulator and its system image with their revisions.
- [ ] The Results record each command as typed, in the package it ran in.
- [ ] The coverage goals in the P09 spec are the ones merged before the run, unchanged.
- [ ] For each component and file set in the coverage goals: the target, then statements, branches, functions and lines, unit-only and whole suite, and whether the target is met.
- [ ] Test counts per level for each package (unit, integration, end-to-end), with main-server's benchmark tests and flow-tests' harness self-test on their own line, outside the product's counts.
- [ ] Each P11 journey passed or failed, with its duration: A1, A2, W1 and W2 on the end-to-end line; M1 and M2, from `pnpm test:device`'s JUnit report, on the integration line as device runs, apart from mobile's Jest counts.
- [ ] Passed, failed and skipped for each package, with the reason for any failure.
- [ ] The Results note that `emitDecoratorMetadata` lowers branch figures on decorated class lines, and that V8 (Vitest) and Istanbul (Jest) count branches differently.
- [ ] The time the measurement took is recorded under `## Comments`; agent time, if an agent helped, goes in an `### Agent usage (YYYY-MM-DD)` section.
