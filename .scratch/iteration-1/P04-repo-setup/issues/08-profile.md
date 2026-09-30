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
- [x] A new User's sign-in says whether onboarding is complete and, until it is, suggests a name and a department read from the Google account's name.
- [x] Completing onboarding saves the profile with a name and a department, and a later sign-in says that onboarding is complete.
- [x] A User who has not finished onboarding gets 403 `ONBOARDING_REQUIRED` with the suggestion on every User route but onboarding and sign-out.
- [x] The lobby answers an onboarded User with their profile.
- [x] Tests through the public API cover reading, editing, and each validation rule.

## Comments

### Decisions (2026-10-01)

- **Storage**: columns on `users`. The profile is `name` and `department` (`NOT NULL`, empty until onboarding), `admission_year` and `hashtags` (`text[]`). Beside it, `google_name` holds the Google account's name at the last sign-in, and `onboarded_at` stays NULL until onboarding. A User has exactly one profile, so a table of its own would only add a join.
- **Sign-in**: `POST /auth/google` still creates the User at the first sign-in and now answers `{ accessToken, refreshToken, onboarding }`. `onboarding` is `{ completed: true }`, or `{ completed: false, suggestion: { name, department } }` until onboarding. Every sign-in stores the ID token's `name` claim as `google_name`, as it does the email address. The refresh answer keeps only the tokens. The route keeps its name.
- **Suggestion** (`UsersService.onboardingOf`): an SNU account's Google name reads `이름 / 역할 / 학과`, such as `홍길동 / 학생 / 컴퓨터공학부`. The first part is suggested as the name and the third as the department, each without the spaces around it, and `null` when it is missing or the limits refuse it. A name without `/` is suggested whole. The role is not stored.
- **Onboarding**: `POST /users/me/onboarding` takes the profile with the name and the department required, under the same limits as an edit, saves it, sets `onboarded_at` and answers 204. Completion is a request of its own, so that a profile filled in by an edit does not count as onboarded. A repeat, sent when the answer was lost, saves the profile again and keeps the first `onboarded_at`; it creates nothing a User would notice twice, so it takes no `Idempotency-Key`. The route stays under `users` while onboarding touches only the User.
- **Lobby**: `POST /lobby`, a module of its own, answers an onboarded User `{ profile }`, the profile as `GET /users/me/profile` gives it. Later features add what the app needs when it starts. It is a POST so that the app can later send what it reports at start without changing the call; it creates nothing, so it takes no key. Like every User route, it refuses a User who has not finished onboarding (see Onboarding guard). The app enters it after a sign-in or a start with stored tokens, and right after onboarding.
- **Profile routes**, in the `users` module: `GET /users/me/profile` and `PATCH /users/me/profile` answer `{ name, department, admissionYear, hashtags }`. They name no User, so a User reaches only their own profile; `/users/:id/profile` does not exist. `PATCH` changes only the fields sent. `null` empties `admissionYear`, and `[]` empties `hashtags`; the name and the department cannot be emptied. Unknown fields are dropped, as in the other request bodies. `GET /users/me` stays `{ id, email }`.
- **Limits**, in `src/users/dto/update-profile.dto.ts`, checked after the spaces around text are dropped:
  - name: 1 to 30 characters;
  - department: 1 to 50 characters of free text. A double major is written out in it, such as `컴퓨터공학부, 경제학부`;
  - admission year: a whole number from 1946, when SNU was founded, to the current year in Korea (Asia/Seoul), worked out on each request;
  - hashtags: at most 20. Each is kept without the `#` in front, which the app adds when it shows one, and in the case sent. It then has 1 to 30 characters without whitespace; any other character is allowed, `C#` included. No hashtag may appear twice, whatever the case, so `AI` with `#ai` is refused.
- **Refusals**: 400 from the validation pipe, whose messages start with the field's path (`name: ...`, `hashtags.0: ...`). Nothing is saved.
- **Onboarding guard**: `AccessTokenGuard` reads the User's `onboarded_at` and `google_name` in the query that already reads the session. Before onboarding, every User route answers 403 `{ statusCode, error, code: 'ONBOARDING_REQUIRED', message, onboarding }`, with the suggestion read from `google_name`, so that an app restarted during onboarding, which does not sign in again, gets onboarding back from its first request. Only `POST /users/me/onboarding` and `POST /auth/sign-out` are marked `@AllowBeforeOnboarding()`; `GET /users/me` and the profile routes are closed too, since the onboarding screen needs only the suggestion. A new route is closed until it is marked. The socket server checks only the token and is not covered.
- **Odd Google names**: a Google name that is not three parts separated by `/` is logged as a warning with the account's email address and the number of parts, so that account types other than undergraduates' show up.
- **Another phone during onboarding**: a sign-in there ends the first phone's session as any sign-in does. The first phone's next request, the onboarding's included, gets 401 `SESSION_REPLACED`, and the other phone goes through onboarding. Two first sign-ins at the same moment create one User, because the sign-in's upsert runs as one `INSERT ... ON CONFLICT`.
- **Docs**: `CONTEXT.md` defines Onboarding and the Lobby, in a section on the app. The P04 spec states onboarding, the guard and the lobby, and the P06 spec's Sign-in section the app's side. The main server README has an "Onboarding and the lobby" section and a Profile section, and its "Adding a feature module" example is now `party`, because a `profile` module and `Profile` model would contradict the profile in `src/users/`.

### Known limits (2026-10-01)

- The `이름 / 역할 / 학과` form of an SNU account's Google name is confirmed on one undergraduate's ID token (`given_name` holds the same string, `family_name` is empty). Graduate students' and graduates' accounts are unchecked. If a form differs, only the suggestion is affected, and the warning in the log shows it.
- SNU's Google accounts belong to current students, graduates and retired staff, who keep them for life ([IS&T](https://ist.snu.ac.kr/en/gmail-mail/)), so the `hd` check admits graduates too.

### Tests (2026-10-01)

- `test/onboarding.e2e-spec.ts`: a new User's sign-in (not completed, the suggestion from each form of Google name, the User created with an empty profile); completing onboarding (the profile saved, a later sign-in completed without a suggestion, only the name and the department needed, a repeat that keeps the stored `onboarded_at`); an invalid onboarding (400 naming the field, nothing saved, `onboarded_at` still NULL); two first sign-ins of one account at the same moment (one User); another phone during onboarding (401 `SESSION_REPLACED` on the first, the other completes); 401 without an access token. The empty profile before onboarding, the stored `onboarded_at` and the User count are read with the test's own database connection, since the profile routes are closed before onboarding.
- `test/onboarding-guard.e2e-spec.ts`: before onboarding, `GET /users/me`, the profile routes, the lobby and an unmarked route of a test-only controller answer 403 with the suggestion, and a route marked `@AllowBeforeOnboarding()` and sign-out pass; a session that has ended still gets 401 first, with `SESSION_REPLACED` after a sign-in on another phone; after onboarding, every one of them passes.
- `test/lobby.e2e-spec.ts`: an onboarded User gets their latest profile; a User before onboarding gets 403 with the suggestion; the suggestion follows the last sign-in's Google name; 401 without an access token.
- `test/profile.e2e-spec.ts` covers reading, editing, another User's profile left as it was and not reachable by its id, and 401 for no access token, a malformed one and an Administrator's. `test/profile-validation.e2e-spec.ts` refuses a value for each rule and checks that a later read shows nothing changed, and accepts the values at each limit.
- In `test/sign-in.ts`, `signIn()` completes onboarding unless the User has, so that the tests of other routes reach them, and `signInBeforeOnboarding()` stops before it. `postOnboarding()` is there too, and `signInResultSchema` parses a sign-in's answer exactly; the auth, session and sign-out tests use it where they read one. `withAccessToken()` sends the access token, or none, for every helper. `getProfile()` and `patchProfile()` are in `test/profile.ts`.
- The upper limit of the admission year is checked on the real clock, with this year in Korea worked out as UTC+9, because the spec replaces nothing but Google's token verification. The hours around New Year, when Korea's year and UTC's differ, are not covered.

### Red before green (2026-10-01)

These failed before their code was written: the onboarding guard on `GET /users/me`, the profile routes and an unmarked test-only route; the sign-in's `onboarding`; the User created with an empty profile; every onboarding and lobby test (404); reading and editing the profile (404); the spaces around the department and the hashtags; the limits of the department, the admission year and the hashtags; the `#` in front of a hashtag; and a repeat in another case. The name's limits already held, because the name rule had come with an earlier test.

These passed at once, because the session rule, the access token check, Prisma's partial update and the rules already covered them: the lobby's 403, another phone during onboarding, a session that has ended before onboarding, 401 on onboarding and on the profile, editing only the fields sent, emptying fields, a later sign-in keeping the name, another User's profile, and a few refusals (a blank, missing or non-text department, an admission year sent as text, a full-width space, a repeat after trimming, hashtags that are not a list). Marking the read route `@Public()` made every read test and all three of its 401 tests fail, setting `onboarded_at` on every onboarding request made the repeat test fail, and checking onboarding before the session made both tests of an ended session fail.

### Agent usage (2026-10-01)

- Agent time: about 3 hours, an estimate, for the one session that did the work, counted from its transcript up to the writing of this section. Time spent waiting for answers is left out; time spent waiting for tests and subagents is kept. Its ten subagents ran inside it: four Standards and four Spec reviews of 2 to 4 minutes each, two at a time, research on how auth platforms create the User around onboarding (about 17 minutes), whose note was not kept, and a Prisma experiment stopped when it was no longer needed.
- Tokens, for the session and its ten subagents, counted when this section was written:
  - Input: 148,351,306 in total, of which 146,176,597 were cache reads, 2,173,615 cache writes and 1,094 uncached.
  - Output: 415,591. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 9,265, is a lower bound.
