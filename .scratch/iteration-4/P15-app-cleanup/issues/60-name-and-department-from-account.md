# 60: The name and the department come from the SNU account and cannot be changed

Parent: [P15 spec](../spec.md), item 60; found by a teammate using the Production app on a phone on the night of 2026-11-18, read in the code of `4.0/Main` at `04898aed`; no board on the team canvas: the request names the change in words, and the screens keep their layout
Status: ready-for-agent
Owner: fyoon46
Blocked by: none. No other open pull request adds a database migration.

Native files: none. Releases: the main server (a data migration), then an app OTA update.

## What is on screen now

- Onboarding fills the name and the department in from the SNU account's Google name, which reads `홍길동 / 학생 / 컴퓨터공학부`, with a "Google 계정에서 가져옴" badge. The User can change both. A department that is not in the app's list is left empty for the User to pick, after a course level (학부생 / 대학원생).
- 프로필 편집 lets the User change both at any time, and the main server stores whatever is sent.
- The service runs on real names: the search and the Assistant reach a person by name, so a changed name hides them.

## What changes

- **Both are the account's, always.** The main server reads the name (first part) and the department (third part) from the Google name, under the profile's limits, and stores them at onboarding and at every later sign-in of an onboarded User. Onboarding and 프로필 편집 show them as fields that cannot be edited, with a lock, and one grey line under them: "이름과 학과는 SNU 계정에서 가져와요".
- **Every SNU account is taken to give both.** One that does not (a Google name without `/`, or a form that differs) raises no error: the main server logs a warning at its sign-in, as it already did for such a name, and again when it completes onboarding, and the missing part stays empty. Only undergraduates' Google names are confirmed to carry the department so far; the warnings show any other form.
- **The main server drops the two from requests.** They are no longer fields of the profile edit or of onboarding, so an older bundle that still sends them has them dropped like any unknown field, and the rest of its request is saved.
- **A User who already changed theirs** gets the account's back: a data migration sets every onboarded User's name and department from the stored Google name, and every later sign-in does the same, so a change of the account's Google name reaches the profile too. Before onboarding both stay empty, as before.
- Onboarding needs nothing to save. With the department fixed, the department search, the course level and the name field are gone from the app, and the head reads "확인하고 바로 시작해요".

## What stays as it is

- Every other field of 프로필 편집: admission year, hashtags, 학적상 이름, 학번 and 소속. 학적상 이름 is still the name the library knows when it differs.
- The sign-in, the onboarding guard and the suggestion's shape (`{ name, department }`, `null` for a part not given).
- The `@` mention of a Friend in the Assistant's chat, which the same report asks for, belongs to the Assistant's batch.

## Acceptance criteria

- [x] Onboarding shows the account's name and department as fixed fields with the grey line, and saves with nothing more to fill in.
- [x] An account that gives no department completes onboarding without an error, with the department empty, and the main server logs a warning.
- [x] 프로필 편집 shows both fixed with the grey line, and a save sends neither; the other fields stay editable.
- [x] `POST /users/me/onboarding` and `PATCH /users/me/profile` drop a name or a department sent, and save the rest.
- [x] A later sign-in of an onboarded User stores the account's name and department again; before onboarding they stay empty.
- [x] The migration replaces an onboarded User's own name and department with the account's, and leaves a part the account does not give as it is.

## Tests

- Main server: `test/onboarding.integration.test.ts` (the account's values stored, an older app's kept out, an account without a department completes), `test/profile.integration.test.ts` (an older app's edit of the two dropped and the rest saved, a later sign-in follows a changed Google name), `test/profile-validation.integration.test.ts` (the name and department rows gone with the fields). `signIn()` in `test/sign-in.ts` now signs in with a Google name made of the profile it is given, so that the other tests' Users keep their names. The whole integration suite passed once locally.
- App: `__tests__/onboarding.integration.test.tsx` and `__tests__/profile-edit.integration.test.tsx` (both fields fixed, the line, a save without them); the department-search tests and `__tests__/department-colleges.unit.test.ts` are gone with the app's department list.
- The migration's SQL was run on sample rows in a throwaway PostgreSQL 17: a nickname replaced, a name without `/` replaced with the stored department kept, an empty Google name and parts over the limits left alone, spaces around the parts dropped.

## Comments

### Agent usage (2026-11-19)

Estimates from the session transcript, with gaps of 5 minutes or more left out, among them the wait for another session to free the emulator. One Opus 5.5 session did the ticket, with no subagents.

- Agent time: about 35 minutes.
- Tokens: output about 95,000. Input about 39.0 million: 38.6 million cache reads, 0.31 million cache writes and about 340 uncached.
