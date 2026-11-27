# 64: The meal stage warms up before its file's first test

Parent: [P05 spec](../spec.md); Main's push run 45932438157 on 7c14e4329, attempt 1, where `test/assistant-meal-origin.integration.test.ts` failed 2 of 3 and passed on the rerun
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: none; tests only.

## What happened

Read from the run's log; nothing was copied out of it.
- **The first test ran out of its 5 seconds.** It is the first request of its file down each route: sign-in, `GET /places`, adding a Class, the menus intake and the chat. Each route costs several times more on its first run than later, because none of the code on its way has run yet.
  - The cost is spread over every route. Locally the first round took about 430 ms and each later round about 145 ms. The extra time was sign-in about +90 ms, the Class about +40 ms, the chat about +70 ms and the meal plan about +60 ms.
  - Every file on `MealPlanStage` shows it in CI. In the passing attempt, first test against the others:
    - `usage-plans`: 2837 ms against 749 ms;
    - `assistant-meal-nearest-first`: 1524 ms against 476 ms;
    - `assistant-meal-origin`: 1007 ms against 309 ms.
  - In attempt 1, two files were migrating and seeding databases of their own on the same PostgreSQL at the time (`createDatabase`, 03:17:26–03:17:44). The first tests of those three files took 5244 ms, 3737 ms and more than 5003 ms. `usage-plans` passed only because it raises its limit to 30 seconds.
- **The second test's `answer: null` came from the first.** Vitest does not stop a test that runs out of time. Its requests went on while the second test ran on the same stage, with the same scripted model and the same clock, so the second request got another test's steps.
  - Shown locally: with the first test's limit set to 40 ms, the second fails on every run, with this ZodError or with a 503 when the script runs out. The third passes.

## What changes

- `MealPlanStage.start()` ends with one warm-up round, under the hook's 60 seconds:
  - a User of its own signs in;
  - the User adds a Class in 301동;
  - menus are posted for 2199-01-08, a Tuesday no test uses;
  - a text reply;
  - a meal plan.
- It then puts the clock back and clears the script. The other files on the stage get the same warm-up.
- Not changed: a test that runs out of time still leaves its requests running into the next one. With the first-run cost gone, the tests stay far below their limit. A stage that waits for the previous test's requests would be its own change.

## Acceptance criteria

- [x] Locally, the first round after the warm-up takes as long as the later ones: about 150 ms, against 430 ms before.
- [x] `test/assistant-meal-origin.integration.test.ts` passes 10 runs in a row with `--maxWorkers=2`.
- [x] Every file on `MealPlanStage` passes one run.
- [x] The whole of the main server's lint, format and types pass.
