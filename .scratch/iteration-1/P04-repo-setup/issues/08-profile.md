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

- **Storage**: four columns on `users`: `name`, `department`, `admission_year` and `hashtags` (`text[]`), added by the migration `add_profile`. A User has exactly one profile, so a table of its own would only add a join and a row to create. Existing Users get an empty profile.
- **Routes**, in the `users` module: `GET /users/me/profile` and `PATCH /users/me/profile`, both answering `{ name, department, admissionYear, hashtags }`. They name no User, so a User reaches only their own profile; `/users/:id/profile` does not exist. `GET /users/me` stays `{ id, email }`.
- **Editing**: `PATCH` changes only the fields sent. `null` empties `department` or `admissionYear`, and `[]` empties `hashtags`; the name cannot be emptied. Unknown fields are dropped, as in the other request bodies. The route creates nothing, so it takes no `Idempotency-Key`: the same body twice leaves the same profile.
- **First name**: the first sign-in takes the ID token's `name` claim, without the spaces around it, if the name rule accepts it; otherwise the name starts as `null`. Later sign-ins leave it alone. The other fields start as `null` and `[]`.
- **Limits**, in `src/users/dto/update-profile.dto.ts`, checked after the spaces around text are dropped:
  - name: 1 to 30 characters;
  - department: 1 to 50 characters of free text;
  - admission year: a whole number from 1946, when SNU was founded, to the current year in Korea (Asia/Seoul), worked out on each request;
  - hashtags: at most 20, each 1 to 30 characters without whitespace, none twice. Any other character is allowed, and the comparison is exact, so `AI` and `ai` are two hashtags.
- **Refusals**: 400 from the validation pipe, whose messages start with the field's path (`name: ...`, `hashtags.0: ...`). Nothing is saved.
- **Docs**: the main server README has a Profile section. Its "Adding a feature module" example is now `party`, because a `profile` module and `Profile` model would contradict the profile in `src/users/`.

### Tests (2026-09-30)

`test/profile.e2e-spec.ts` covers reading, the first name from Google, editing, another User's profile left as it was and not reachable by its id, and 401 for no access token, a malformed one and an Administrator's. `test/profile-validation.e2e-spec.ts` refuses a value for each rule and checks that a later read shows nothing changed, and accepts the values at each limit. `getProfile()` and `patchProfile()` are in `test/profile.ts`.

The upper limit of the admission year is checked on the real clock, with this year in Korea worked out as UTC+9, because the spec replaces nothing but Google's token verification. The hours around New Year, when Korea's year and UTC's differ, are not covered.

### Red before green (2026-09-30)

These failed before their code was written: reading and editing (404), a blank or too long name from Google, the spaces around the department and the hashtags, and the limits of the department, the admission year and the hashtags. The name's limits already held, because the first-name check had brought them in.

These passed at once, because the `me` routes, the global guard, Prisma's partial update and the rules already covered them: editing only the fields sent, emptying fields, a later sign-in keeping the name, another User's profile, 401, and a few refusals (a blank or non-text department, an admission year sent as text, a full-width space, a repeat after trimming, hashtags that are not a list). Marking the read route `@Public()` made every read test and all three 401 tests fail.

### Agent usage (2026-09-30)

- Agent time: about 30 minutes, an estimate, counted as the gaps under 5 minutes between transcript entries of the one session that did the work, up to the writing of this section. Its two review subagents, about 2 and 3 minutes at the same time, ran inside it.
- Tokens, for the session and its two subagents, counted when this section was written:
  - Input: 18,500,526 in total, of which 18,088,351 were cache reads, 411,941 cache writes and 234 uncached.
  - Output: 80,958. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 1,826, is a lower bound.
