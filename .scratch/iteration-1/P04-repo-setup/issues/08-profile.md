# 08: View and edit the profile

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

A signed-in SNU student views and edits their own name, department, admission year and interest hashtags, so that others and Matching know who they are.

The profile screen belongs to P06.

## Acceptance criteria

- [x] A signed-in User reads their own profile: name, department, admission year and interest hashtags.
- [x] A signed-in User changes any of these fields. The response and a later read show the saved values.
- [x] Invalid values are refused with 400 and a message naming the field, for example an empty name, an admission year outside a plausible range, or too many or too long hashtags. The limits chosen are stated in the API's data transfer objects.
- [x] A User can only read and change their own profile through these routes.
- [x] A request without a valid access token gets 401.
- [x] Tests through the public API cover reading, editing, and each validation rule.

## Comments

### Decisions (2026-09-30)

- **Storage**: four columns on `users`: `name` and `department`, both required, `admission_year` and `hashtags` (`text[]`). A User has exactly one profile, so a table of its own would only add a join and a row to create. The migration `add_profile` deletes the Users stored before, with their sessions and refresh tokens, because they have no name or department. Before the first deployment only local databases hold Users, and they sign up again.
- **Sign-up**: an account's User is created by its first sign-in that carries `profile: { name, department }`, which the app's onboarding collects, under the same limits as an edit. `POST /auth/google` without it answers 422 `{ statusCode, error, code: 'PROFILE_REQUIRED', message, suggestion: { name, department } }` and stores nothing, so no User exists without a name and a department. The Google ID token stays valid for an hour, so the app sends the same one again after onboarding. `profile` is checked like the rest of the body, and on an account that has a User it changes nothing; of two first sign-ins at the same moment, the first stored wins.
- **Suggestion** (`UsersService.suggestProfile`): an SNU account's Google name reads `이름 / 역할 / 학과`, such as `홍길동 / 학생 / 컴퓨터공학부`. The first part is suggested as the name and the third as the department, each without the spaces around it, and `null` when it is missing or the limits refuse it. A name without `/` is suggested whole. The role is not stored.
- **Schemas**: the app's sign-in takes `appSignInSchema`, which adds `profile` to the `signInSchema` that the admin site's sign-in keeps.
- **Routes**, in the `users` module: `GET /users/me/profile` and `PATCH /users/me/profile`, both answering `{ name, department, admissionYear, hashtags }`. They name no User, so a User reaches only their own profile; `/users/:id/profile` does not exist. `GET /users/me` stays `{ id, email }`.
- **Editing**: `PATCH` changes only the fields sent. `null` empties `admissionYear`, and `[]` empties `hashtags`; the name and the department cannot be emptied. Unknown fields are dropped, as in the other request bodies. The route creates nothing, so it takes no `Idempotency-Key`: the same body twice leaves the same profile.
- **Limits**, in `src/users/dto/update-profile.dto.ts`, checked after the spaces around text are dropped:
  - name: 1 to 30 characters;
  - department: 1 to 50 characters of free text. A double major is written out in it, such as `컴퓨터공학부, 경제학부`;
  - admission year: a whole number from 1946, when SNU was founded, to the current year in Korea (Asia/Seoul), worked out on each request;
  - hashtags: at most 20. Each is kept without the `#` in front, which the app adds when it shows one, and in the case sent. It then has 1 to 30 characters without whitespace; any other character is allowed, `C#` included. No hashtag may appear twice, whatever the case, so `AI` with `#ai` is refused.
- **Refusals**: 400 from the validation pipe, whose messages start with the field's path (`name: ...`, `hashtags.0: ...`, `profile.department: ...`). Nothing is saved.
- **Docs**: `CONTEXT.md` defines a User as having given a name and a department, and the P04 spec's sign-in and profile bullets state the sign-up. The main server README describes it under Sign-in and has a Profile section. Its "Adding a feature module" example is now `party`, because a `profile` module and `Profile` model would contradict the profile in `src/users/`.

### Known limits (2026-09-30)

- The `이름 / 역할 / 학과` form of an SNU account's Google name has not been checked against a real ID token's `name` claim. If it differs, only the suggestion is affected: the onboarding starts from fewer values, and sign-up works as before.
- The app's onboarding screen is not part of P04. P06's sign-in needs it before a new account can get in.

### Tests (2026-09-30)

`test/sign-up.e2e-spec.ts` covers a new account without a profile (422, the suggestion from each form of Google name, nothing stored), with one (the User created, the profile trimmed), with an invalid one (400 naming `profile.name` or `profile.department`, nothing stored), and an existing User's sign-in with another profile or none. `test/profile.e2e-spec.ts` covers reading, editing, another User's profile left as it was and not reachable by its id, and 401 for no access token, a malformed one and an Administrator's. `test/profile-validation.e2e-spec.ts` refuses a value for each rule and checks that a later read shows nothing changed, and accepts the values at each limit. `getProfile()` and `patchProfile()` are in `test/profile.ts`. `signIn()` and `postSignIn()` in `test/sign-in.ts` send the profile `NEW_PROFILE` unless told otherwise, and `postSignIn(app, claims, null)` signs in as the app does before onboarding.

The upper limit of the admission year is checked on the real clock, with this year in Korea worked out as UTC+9, because the spec replaces nothing but Google's token verification. The hours around New Year, when Korea's year and UTC's differ, are not covered.

### Red before green (2026-09-30)

These failed before their code was written: reading and editing (404); every sign-up test; the spaces around the department and the hashtags; the limits of the department, the admission year and the hashtags; the `#` in front of a hashtag; and a repeat in another case. The name's limits already held, because the name rule had been written for an earlier test.

These passed at once, because the `me` routes, the global guard, Prisma's partial update and the rules already covered them: editing only the fields sent, emptying fields, a later sign-in keeping the name, another User's profile, 401, and a few refusals (a blank, missing or non-text department, an admission year sent as text, a full-width space, a repeat after trimming, hashtags that are not a list). Marking the read route `@Public()` made every read test and all three 401 tests fail.

### Agent usage (2026-09-30)

- Agent time: about 55 minutes, an estimate, for the one session that did the work, counted from its transcript up to the writing of this section. Time spent waiting for answers is left out. Its four review subagents, about 2 to 3 minutes each, two at a time, ran inside it.
- Tokens, for the session and its four subagents, counted when this section was written:
  - Input: 41,911,206 in total, of which 41,171,371 were cache reads, 739,421 cache writes and 414 uncached.
  - Output: 167,251. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 4,080, is a lower bound.
